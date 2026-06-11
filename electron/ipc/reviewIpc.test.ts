import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import type { AIReviewAdapter } from "../services/aiReviewService";
import { createEntryRule } from "../services/ruleService";
import { createClosedTrade } from "../services/tradeService";
import { createReviewIpcHandlers } from "./reviewIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-review-ipc-"));
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

describe("createReviewIpcHandlers", () => {
  it("creates and resolves review states through narrow handlers", () => {
    const db = createTestDb();
    const handlers = createReviewIpcHandlers(db);
    const rule = createEntryRule(db, {
      name: "Opening range pullback",
      content: "Break, retest, enter with defined risk.",
      checklist: ["Break confirmed"],
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
      feesTotal: 5,
      entryRuleVersionId: rule.latestVersion.id,
    });

    expect(handlers.getLatestForTrade(trade.id)).toBeUndefined();

    const draft = handlers.createDraft({
      tradeId: trade.id,
      summary: "Draft summary",
      strengths: ["risk defined"],
      rawResult: { providerId: "review-ipc-1" },
    });

    expect(draft).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        status: "needs_review",
        summary: "Draft summary",
      }),
    );
    expect(handlers.getLatestForTrade(trade.id)).toEqual(draft);
    expect(handlers.confirm(draft.id)).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "confirmed",
      }),
    );
    expect(
      handlers.correct(draft.id, {
        summary: "Corrected summary",
      }),
    ).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "corrected",
        summary: "Corrected summary",
      }),
    );
    const check = db
      .prepare("select id from trade_rule_check where trade_id = ?")
      .get(trade.id) as { id: number };

    expect(
      handlers.updateRuleCheck(check.id, {
        result: "fail",
        evidence: "Chart never retested the breakout.",
        comment: "Manual review from screenshot.",
      }),
    ).toEqual(
      expect.objectContaining({
        id: check.id,
        tradeId: trade.id,
        result: "fail",
        evidence: "Chart never retested the breakout.",
        comment: "Manual review from screenshot.",
      }),
    );
    expect(handlers.invalidate(draft.id)).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "invalid",
      }),
    );

    db.close();
  });

  it("generates an AI review draft through the configured adapter", async () => {
    const db = createTestDb();
    const rule = createEntryRule(db, {
      name: "Opening range pullback",
      content: "Break, retest, enter with defined risk.",
      checklist: ["Break confirmed"],
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
      feesTotal: 5,
      entryRuleVersionId: rule.latestVersion.id,
    });
    const adapter: AIReviewAdapter = {
      generate: async () => ({
        model: "gpt-5.5",
        promptVersion: "single-trade-ai-v1",
        summary: "Generated review.",
        scoreTotal: 88,
        facts: { symbol: "ES" },
        missingInfo: [],
        imageObservations: [],
        strengths: ["Good risk definition."],
        weaknesses: [],
        suggestions: [],
        tags: ["rule-following"],
        confidence: 0.8,
        rawResult: { provider: "openai", responseId: "resp_test" },
        ruleChecks: [
          {
            checkItem: "Break confirmed",
            result: "pass",
            evidence: "The note confirms the break.",
            comment: "AI generated.",
            scoreDelta: 4,
          },
        ],
      }),
    };
    const handlers = createReviewIpcHandlers(db, adapter);

    const review = await handlers.generateDraft(trade.id);

    expect(review).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        model: "gpt-5.5",
        summary: "Generated review.",
      }),
    );
    expect(
      db
        .prepare(
          `select result, evidence
           from trade_rule_check
           where trade_id = ?`,
        )
        .get(trade.id),
    ).toEqual({
      result: "pass",
      evidence: "The note confirms the break.",
    });

    db.close();
  });
});
