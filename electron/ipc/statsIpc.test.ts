import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { confirmReview, createReviewDraft } from "../services/reviewService";
import { createEntryRule } from "../services/ruleService";
import { createClosedTrade } from "../services/tradeService";
import { createStatsIpcHandlers } from "./statsIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-stats-ipc-"));
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

describe("createStatsIpcHandlers", () => {
  it("exposes the stats overview through a narrow handler", () => {
    const db = createTestDb();
    const handlers = createStatsIpcHandlers(db);
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
    });

    confirmReview(db, createReviewDraft(db, { tradeId: trade.id }).id);

    expect(handlers.getOverview()).toEqual(
      expect.objectContaining({
        totalTradeCount: 1,
        confirmedReviewCount: 1,
        totalNetPnl: 445,
        winRate: 1,
      }),
    );

    db.close();
  });

  it("passes filters through to the stats overview service", () => {
    const db = createTestDb();
    const handlers = createStatsIpcHandlers(db);
    const esTrade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      feesTotal: 5,
    });
    const mnqTrade = createClosedTrade(db, {
      symbol: "MNQ",
      direction: "short",
      openedAt: "2026-06-08T15:18:00.000Z",
      closedAt: "2026-06-08T16:02:00.000Z",
      entryPrice: 19000,
      exitPrice: 18984,
      quantity: 3,
      stopLossPrice: 19008,
      feesTotal: 3.6,
    });

    confirmReview(db, createReviewDraft(db, { tradeId: esTrade.id }).id);
    confirmReview(db, createReviewDraft(db, { tradeId: mnqTrade.id }).id);

    expect(handlers.getOverview({ symbol: "MNQ" })).toEqual(
      expect.objectContaining({
        totalTradeCount: 1,
        confirmedReviewCount: 1,
        totalNetPnl: 92.4,
      }),
    );

    db.close();
  });

  it("passes entry rule filters through to the stats overview service", () => {
    const db = createTestDb();
    const handlers = createStatsIpcHandlers(db);
    const pullbackRule = createEntryRule(db, {
      name: "Opening range pullback",
      content: "Break, retest, enter with defined risk.",
      checklist: ["Break confirmed"],
    });
    const reversalRule = createEntryRule(db, {
      name: "Failed breakout reversal",
      content: "Failed break, reclaim, fade back into range.",
      checklist: ["Failed break"],
    });
    const pullbackTrade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      feesTotal: 5,
      entryRuleVersionId: pullbackRule.latestVersion.id,
    });
    const reversalTrade = createClosedTrade(db, {
      symbol: "ES",
      direction: "short",
      openedAt: "2026-06-09T14:41:00.000Z",
      closedAt: "2026-06-09T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5298.5,
      quantity: 2,
      stopLossPrice: 5302,
      feesTotal: 5,
      entryRuleVersionId: reversalRule.latestVersion.id,
    });

    confirmReview(db, createReviewDraft(db, { tradeId: pullbackTrade.id }).id);
    confirmReview(db, createReviewDraft(db, { tradeId: reversalTrade.id }).id);

    expect(handlers.getOverview({ entryRuleId: pullbackRule.id })).toEqual(
      expect.objectContaining({
        totalTradeCount: 1,
        confirmedReviewCount: 1,
        totalNetPnl: 445,
      }),
    );

    db.close();
  });
});
