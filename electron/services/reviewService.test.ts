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
});
