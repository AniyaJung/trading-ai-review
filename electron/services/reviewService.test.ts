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
  updateRuleCheck,
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

function listNormalizedTradeTags(db: ReturnType<typeof createTestDb>, tradeId: number) {
  return db
    .prepare(
      `select tag.name, tag.category
       from trade_tag_map
       join tag on tag.id = trade_tag_map.tag_id
       where trade_tag_map.trade_id = ?
       order by tag.name`,
    )
    .all(tradeId);
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
    expect(listNormalizedTradeTags(db, trade.id)).toEqual([]);

    db.close();
  });

  it("does not overwrite manual tag mappings when AI review tags change", () => {
    const { db, trade } = createTradeReadyForReview();
    const review = createReviewDraft(db, {
      tradeId: trade.id,
      tags: ["late-entry"],
    });

    confirmReview(db, review.id);
    db.prepare("insert into tag (name, category) values ('manual-note', 'setup')")
      .run();
    const manualTag = db
      .prepare("select id from tag where name = 'manual-note'")
      .get() as { id: number };
    db.prepare(
      `insert into trade_tag_map (trade_id, tag_id, source)
       values (?, ?, 'manual')`,
    ).run(trade.id, manualTag.id);

    correctReview(db, review.id, {
      tags: ["rule-following"],
    });
    invalidateReview(db, review.id);

    expect(listNormalizedTradeTags(db, trade.id)).toEqual([
      { name: "manual-note", category: "setup" },
    ]);

    db.close();
  });

  it("normalizes review tags only after confirmation", () => {
    const { db, trade } = createTradeReadyForReview();
    const review = createReviewDraft(db, {
      tradeId: trade.id,
      tags: ["late-entry"],
    });

    expect(listNormalizedTradeTags(db, trade.id)).toEqual([]);

    confirmReview(db, review.id);

    expect(listNormalizedTradeTags(db, trade.id)).toEqual([
      { name: "late-entry", category: "setup" },
    ]);

    db.close();
  });

  it("replaces normalized tags when a review is corrected", () => {
    const { db, trade } = createTradeReadyForReview();
    const review = createReviewDraft(db, {
      tradeId: trade.id,
      tags: ["late-entry", " late-entry ", "", { ignored: true }],
    });

    confirmReview(db, review.id);
    expect(listNormalizedTradeTags(db, trade.id)).toEqual([
      { name: "late-entry", category: "setup" },
    ]);

    correctReview(db, review.id, {
      tags: ["rule-following", "patience"],
    });

    expect(listNormalizedTradeTags(db, trade.id)).toEqual([
      { name: "patience", category: "setup" },
      { name: "rule-following", category: "setup" },
    ]);

    db.close();
  });

  it("clears normalized tags when a review is invalidated", () => {
    const { db, trade } = createTradeReadyForReview();
    const review = createReviewDraft(db, {
      tradeId: trade.id,
      tags: ["late-entry"],
    });

    confirmReview(db, review.id);
    expect(listNormalizedTradeTags(db, trade.id)).toEqual([
      { name: "late-entry", category: "setup" },
    ]);

    invalidateReview(db, review.id);

    expect(listNormalizedTradeTags(db, trade.id)).toEqual([]);

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

  it("updates a rule check result with human evidence and comment", () => {
    const { db, trade } = createTradeReadyForReview();

    createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Draft summary",
    });

    const check = db
      .prepare("select id from trade_rule_check where trade_id = ? order by id limit 1")
      .get(trade.id) as { id: number };

    const updated = updateRuleCheck(db, check.id, {
      result: "pass",
      evidence: "Entry screenshot shows the opening range break.",
      comment: "Manually confirmed after reviewing chart.",
    });

    expect(updated).toEqual({
      id: check.id,
      tradeId: trade.id,
      entryRuleVersionId: expect.any(Number),
      checkItem: "Break confirmed",
      result: "pass",
      evidence: "Entry screenshot shows the opening range break.",
      comment: "Manually confirmed after reviewing chart.",
      scoreDelta: null,
      createdAt: expect.any(String),
    });

    expect(
      db
        .prepare(
          `select result, evidence, comment
           from trade_rule_check
           where id = ?`,
        )
        .get(check.id),
    ).toEqual({
      result: "pass",
      evidence: "Entry screenshot shows the opening range break.",
      comment: "Manually confirmed after reviewing chart.",
    });

    db.close();
  });

  it("normalizes blank optional rule check text to null", () => {
    const { db, trade } = createTradeReadyForReview();

    createReviewDraft(db, {
      tradeId: trade.id,
      summary: "Draft summary",
    });

    const check = db
      .prepare("select id from trade_rule_check where trade_id = ? order by id limit 1")
      .get(trade.id) as { id: number };

    const updated = updateRuleCheck(db, check.id, {
      result: "unknown",
      evidence: "   ",
      comment: "",
    });

    expect(updated).toEqual(
      expect.objectContaining({
        result: "unknown",
        evidence: null,
        comment: null,
      }),
    );

    db.close();
  });

  it("rejects rule check updates for missing checks", () => {
    const db = createTestDb();

    expect(() =>
      updateRuleCheck(db, 999, {
        result: "fail",
        evidence: "No retest.",
        comment: "Manual check.",
      }),
    ).toThrow("Rule check 999 was not found.");

    db.close();
  });
});
