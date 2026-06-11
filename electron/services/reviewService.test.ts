import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createEntryRule } from "./ruleService";
import { createClosedTrade, listTrades } from "./tradeService";
import {
  confirmReview,
  correctReview,
  createReviewDraft,
  getLatestReviewForTrade,
  invalidateReview,
} from "./reviewService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-reviews-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

function createTradeReadyForReview() {
  const db = createTestDb();
  const rule = createEntryRule(db, {
    name: "Opening range pullback",
    marketType: "index_futures",
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
  });

  return { db, rule, trade };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("reviewService", () => {
  it("creates a review draft and marks the trade as needing review", () => {
    const { db, rule, trade } = createTradeReadyForReview();

    const review = createReviewDraft(db, {
      tradeId: trade.id,
      model: "gpt-4.1",
      promptVersion: "single-trade-v1",
      ruleVersionSnapshot: rule.latestVersion.content,
      scoreTotal: 82,
      summary: "Good execution, but confirmation was late.",
      facts: { symbol: "ES", direction: "long" },
      missingInfo: ["market context"],
      imageObservations: ["entry screenshot missing"],
      strengths: ["risk was defined"],
      weaknesses: ["late confirmation"],
      suggestions: ["capture pre-entry chart"],
      tags: ["late-entry"],
      confidence: 0.74,
      rawResult: { providerId: "review-1" },
    });

    expect(review).toEqual(
      expect.objectContaining({
        id: 1,
        tradeId: trade.id,
        status: "needs_review",
        model: "gpt-4.1",
        promptVersion: "single-trade-v1",
        scoreTotal: 82,
        summary: "Good execution, but confirmation was late.",
        facts: { symbol: "ES", direction: "long" },
        missingInfo: ["market context"],
        imageObservations: ["entry screenshot missing"],
        strengths: ["risk was defined"],
        weaknesses: ["late confirmation"],
        suggestions: ["capture pre-entry chart"],
        tags: ["late-entry"],
        confidence: 0.74,
        rawResult: { providerId: "review-1" },
        confirmedAt: null,
      }),
    );
    expect(listTrades(db)[0].aiReviewStatus).toBe("needs_review");
    expect(getLatestReviewForTrade(db, trade.id)).toEqual(review);

    db.close();
  });

  it("confirms, corrects, and invalidates reviews while syncing trade status", () => {
    const { db, trade } = createTradeReadyForReview();
    const review = createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Draft summary",
      rawResult: { providerId: "review-2" },
    });

    const confirmed = confirmReview(db, review.id);
    expect(confirmed).toEqual(
      expect.objectContaining({
        id: review.id,
        status: "confirmed",
        confirmedAt: expect.any(String),
      }),
    );
    expect(listTrades(db)[0].aiReviewStatus).toBe("confirmed");

    const corrected = correctReview(db, review.id, {
      summary: "User corrected summary",
      suggestions: ["tighten execution trigger"],
      tags: ["rule-following"],
    });
    expect(corrected).toEqual(
      expect.objectContaining({
        id: review.id,
        status: "corrected",
        summary: "User corrected summary",
        suggestions: ["tighten execution trigger"],
        tags: ["rule-following"],
        confirmedAt: expect.any(String),
      }),
    );
    expect(listTrades(db)[0].aiReviewStatus).toBe("corrected");

    const invalid = invalidateReview(db, review.id);
    expect(invalid).toEqual(
      expect.objectContaining({
        id: review.id,
        status: "invalid",
        confirmedAt: null,
      }),
    );
    expect(listTrades(db)[0].aiReviewStatus).toBe("invalid");

    db.close();
  });
  it("creates default unknown rule checks from the bound rule checklist without duplicating them", () => {
    const { db, rule, trade } = createTradeReadyForReview();

    createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Draft summary",
    });
    createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Second draft summary",
    });

    const checks = db
      .prepare(
        `select
          trade_id as tradeId,
          entry_rule_version_id as entryRuleVersionId,
          check_item as checkItem,
          result,
          evidence,
          comment,
          score_delta as scoreDelta
        from trade_rule_check
        where trade_id = ?
        order by id`,
      )
      .all(trade.id);

    expect(checks).toEqual([
      {
        tradeId: trade.id,
        entryRuleVersionId: rule.latestVersion.id,
        checkItem: "Break confirmed",
        result: "unknown",
        evidence: null,
        comment: "等待 AI 或人工确认。",
        scoreDelta: null,
      },
      {
        tradeId: trade.id,
        entryRuleVersionId: rule.latestVersion.id,
        checkItem: "Retest held",
        result: "unknown",
        evidence: null,
        comment: "等待 AI 或人工确认。",
        scoreDelta: null,
      },
    ]);

    db.close();
  });

  it("does not create rule checks for trades without a bound rule version", () => {
    const db = createTestDb();
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
    });

    createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Draft summary",
    });

    expect(
      db
        .prepare("select count(*) as count from trade_rule_check where trade_id = ?")
        .get(trade.id),
    ).toEqual({ count: 0 });

    db.close();
  });


});
