import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { confirmReview, correctReview, createReviewDraft } from "./reviewService";
import { createEntryRule } from "./ruleService";
import { getStatsOverview } from "./statsService";
import { createClosedTrade, type CreateClosedTradeInput } from "./tradeService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-stats-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

function validClosedTradeInput(
  overrides: Partial<CreateClosedTradeInput> = {},
): CreateClosedTradeInput {
  return {
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
    ...overrides,
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("getStatsOverview", () => {
  it("summarizes only confirmed or corrected trades for performance metrics", () => {
    const db = createTestDb();
    const confirmedTrade = createClosedTrade(db, validClosedTradeInput());
    const correctedTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        symbol: "MNQ",
        direction: "short",
        openedAt: "2026-06-09T15:18:00.000Z",
        closedAt: "2026-06-09T16:02:00.000Z",
        entryPrice: 19000,
        exitPrice: 18984,
        quantity: 3,
        stopLossPrice: 19008,
        takeProfitPrice: null,
        feesTotal: 3.6,
      }),
    );
    createClosedTrade(
      db,
      validClosedTradeInput({
        symbol: "MES",
        openedAt: "2026-06-10T13:57:00.000Z",
        closedAt: "2026-06-10T14:22:00.000Z",
        entryPrice: 5291.25,
        exitPrice: 5288.25,
        quantity: 1,
        stopLossPrice: 5288.75,
        takeProfitPrice: null,
        feesTotal: 1.5,
      }),
    );

    confirmReview(
      db,
      createReviewDraft(db, { tradeId: confirmedTrade.id }).id,
    );
    correctReview(
      db,
      createReviewDraft(db, { tradeId: correctedTrade.id }).id,
      { summary: "User corrected review." },
    );

    expect(getStatsOverview(db)).toEqual({
      totalTradeCount: 3,
      confirmedReviewCount: 2,
      totalNetPnl: 537.4,
      winRate: 1,
      averageRMultiple: 2.075,
      profitFactor: null,
      totalFees: 8.6,
      byInstrument: [
        {
          symbol: "ES",
          instrumentName: "E-mini S&P 500",
          tradeCount: 1,
          netPnl: 445,
          winRate: 1,
          averageRMultiple: 2.225,
          profitFactor: null,
          feesTotal: 5,
        },
        {
          symbol: "MNQ",
          instrumentName: "Micro E-mini Nasdaq-100",
          tradeCount: 1,
          netPnl: 92.4,
          winRate: 1,
          averageRMultiple: 1.925,
          profitFactor: null,
          feesTotal: 3.6,
        },
      ],
    });

    db.close();
  });

  it("calculates win rate and profit factor from confirmed net PnL", () => {
    const db = createTestDb();
    const winner = createClosedTrade(db, validClosedTradeInput());
    const loser = createClosedTrade(
      db,
      validClosedTradeInput({
        openedAt: "2026-06-09T14:41:00.000Z",
        closedAt: "2026-06-09T15:20:00.000Z",
        entryPrice: 5300,
        exitPrice: 5298.5,
        quantity: 2,
        stopLossPrice: 5298,
        takeProfitPrice: null,
        feesTotal: 5,
      }),
    );

    confirmReview(db, createReviewDraft(db, { tradeId: winner.id }).id);
    confirmReview(db, createReviewDraft(db, { tradeId: loser.id }).id);

    const overview = getStatsOverview(db);

    expect(overview.totalTradeCount).toBe(2);
    expect(overview.confirmedReviewCount).toBe(2);
    expect(overview.totalNetPnl).toBe(290);
    expect(overview.winRate).toBe(0.5);
    expect(overview.averageRMultiple).toBe(0.725);
    expect(overview.profitFactor).toBe(445 / 155);
    expect(overview.totalFees).toBe(10);
    expect(overview.byInstrument).toEqual([
      expect.objectContaining({
        symbol: "ES",
        tradeCount: 2,
        netPnl: 290,
        winRate: 0.5,
        profitFactor: 445 / 155,
      }),
    ]);

    db.close();
  });

  it("returns empty metric defaults when no reviews have been confirmed", () => {
    const db = createTestDb();
    createClosedTrade(db, validClosedTradeInput());

    expect(getStatsOverview(db)).toEqual({
      totalTradeCount: 1,
      confirmedReviewCount: 0,
      totalNetPnl: 0,
      winRate: null,
      averageRMultiple: null,
      profitFactor: null,
      totalFees: 0,
      byInstrument: [],
    });

    db.close();
  });

  it("filters trade counts and confirmed metrics by opened time and symbol", () => {
    const db = createTestDb();
    const oldEsTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        openedAt: "2026-06-01T14:41:00.000Z",
        closedAt: "2026-06-01T15:20:00.000Z",
      }),
    );
    const recentEsTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        openedAt: "2026-06-10T14:41:00.000Z",
        closedAt: "2026-06-10T15:20:00.000Z",
      }),
    );
    const recentMnqTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        symbol: "MNQ",
        direction: "short",
        openedAt: "2026-06-10T15:18:00.000Z",
        closedAt: "2026-06-10T16:02:00.000Z",
        entryPrice: 19000,
        exitPrice: 18984,
        quantity: 3,
        stopLossPrice: 19008,
        takeProfitPrice: null,
        feesTotal: 3.6,
      }),
    );

    for (const trade of [oldEsTrade, recentEsTrade, recentMnqTrade]) {
      confirmReview(db, createReviewDraft(db, { tradeId: trade.id }).id);
    }

    expect(
      getStatsOverview(db, {
        symbol: "ES",
        openedFrom: "2026-06-08T00:00:00.000Z",
        openedBefore: "2026-06-11T00:00:00.000Z",
      }),
    ).toEqual({
      totalTradeCount: 1,
      confirmedReviewCount: 1,
      totalNetPnl: 445,
      winRate: 1,
      averageRMultiple: 2.225,
      profitFactor: null,
      totalFees: 5,
      byInstrument: [
        expect.objectContaining({
          symbol: "ES",
          tradeCount: 1,
          netPnl: 445,
        }),
      ],
    });

    db.close();
  });

  it("filters trade counts and confirmed metrics by entry rule", () => {
    const db = createTestDb();
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
    const pullbackTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        entryRuleVersionId: pullbackRule.latestVersion.id,
      }),
    );
    const reversalTrade = createClosedTrade(
      db,
      validClosedTradeInput({
        direction: "short",
        openedAt: "2026-06-09T14:41:00.000Z",
        closedAt: "2026-06-09T15:20:00.000Z",
        entryPrice: 5300,
        exitPrice: 5298.5,
        stopLossPrice: 5302,
        takeProfitPrice: null,
        entryRuleVersionId: reversalRule.latestVersion.id,
      }),
    );

    confirmReview(db, createReviewDraft(db, { tradeId: pullbackTrade.id }).id);
    confirmReview(db, createReviewDraft(db, { tradeId: reversalTrade.id }).id);

    expect(
      getStatsOverview(db, {
        entryRuleId: pullbackRule.id,
      }),
    ).toEqual({
      totalTradeCount: 1,
      confirmedReviewCount: 1,
      totalNetPnl: 445,
      winRate: 1,
      averageRMultiple: 2.225,
      profitFactor: null,
      totalFees: 5,
      byInstrument: [
        expect.objectContaining({
          symbol: "ES",
          tradeCount: 1,
          netPnl: 445,
        }),
      ],
    });

    db.close();
  });
});
