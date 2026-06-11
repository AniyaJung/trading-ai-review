import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createEntryRule } from "./ruleService";
import { createClosedTrade } from "./tradeService";
import {
  generateAIReviewDraft,
  type AIReviewAdapter,
} from "./aiReviewService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-ai-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("generateAIReviewDraft", () => {
  it("creates a review draft from an AI adapter and applies generated rule checks", async () => {
    const db = createTestDb();
    const rule = createEntryRule(db, {
      name: "Opening range pullback",
      content: "Break, retest, enter with defined risk.",
      checklist: ["Break confirmed", "Retest held"],
    });
    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      takeProfitPrice: 5306,
      feesTotal: 5,
      entryRuleVersionId: rule.latestVersion.id,
      entryReason: "Breakout pulled back into VWAP.",
    });
    const adapter: AIReviewAdapter = {
      generate: async (input) => {
        expect(input.trade).toEqual(
          expect.objectContaining({
            id: trade.id,
            symbol: "ES",
            entryRuleContent: "Break, retest, enter with defined risk.",
          }),
        );
        expect(input.trade.entryRuleChecklist).toEqual([
          "Break confirmed",
          "Retest held",
        ]);

        return {
          model: "gpt-5.5",
          promptVersion: "single-trade-ai-v1",
          summary: "Strong rule-following trade with clean risk definition.",
          scoreTotal: 86,
          facts: { symbol: "ES", direction: "long" },
          missingInfo: [],
          imageObservations: ["No screenshots were attached."],
          strengths: ["Risk was defined before entry."],
          weaknesses: ["Exit context is thin."],
          suggestions: ["Attach marked entry and exit charts next time."],
          tags: ["rule-following"],
          confidence: 0.82,
          rawResult: { provider: "openai", responseId: "resp_123" },
          ruleChecks: [
            {
              checkItem: "Break confirmed",
              result: "pass",
              evidence: "Trade note says the breakout pulled back into VWAP.",
              comment: "AI generated from trade notes.",
              scoreDelta: 4,
            },
            {
              checkItem: "Retest held",
              result: "unknown",
              evidence: null,
              comment: "No chart screenshot was attached.",
              scoreDelta: 0,
            },
          ],
        };
      },
    };

    const review = await generateAIReviewDraft(db, trade.id, adapter);

    expect(review).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        status: "needs_review",
        model: "gpt-5.5",
        promptVersion: "single-trade-ai-v1",
        summary: "Strong rule-following trade with clean risk definition.",
        scoreTotal: 86,
      }),
    );
    expect(
      db
        .prepare(
          `select check_item as checkItem, result, evidence, comment, score_delta as scoreDelta
           from trade_rule_check
           where trade_id = ?
           order by id`,
        )
        .all(trade.id),
    ).toEqual([
      {
        checkItem: "Break confirmed",
        result: "pass",
        evidence: "Trade note says the breakout pulled back into VWAP.",
        comment: "AI generated from trade notes.",
        scoreDelta: 4,
      },
      {
        checkItem: "Retest held",
        result: "unknown",
        evidence: null,
        comment: "No chart screenshot was attached.",
        scoreDelta: 0,
      },
    ]);

    db.close();
  });

  it("rejects generating a review for a missing trade", async () => {
    const db = createTestDb();
    const adapter: AIReviewAdapter = {
      generate: async () => {
        throw new Error("Adapter should not be called.");
      },
    };

    await expect(generateAIReviewDraft(db, 999, adapter)).rejects.toThrow(
      "Trade 999 was not found.",
    );

    db.close();
  });
});
