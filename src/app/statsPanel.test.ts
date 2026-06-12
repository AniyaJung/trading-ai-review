import { describe, expect, it } from "vitest";
import {
  buildStatsOverviewFilters,
  createEmptyStatsOverview,
  createPreviewStatsOverview,
  createStatsEntryRuleOptions,
  filterTradesForStatsDrilldown,
  formatCurrency,
  formatPercent,
  formatRatio,
  getInitialStatsFilterState,
  getStatsPanelState,
} from "./statsPanel";

describe("stats panel helpers", () => {
  it("uses real desktop stats when they are available", () => {
    const overview = {
      totalTradeCount: 3,
      confirmedReviewCount: 2,
      totalNetPnl: 537.4,
      winRate: 1,
      averageRMultiple: 2.075,
      profitFactor: null,
      totalFees: 8.6,
      byInstrument: [],
    };

    expect(
      getStatsPanelState({
        runtime: "electron",
        overview,
        trades: [],
      }),
    ).toEqual({ overview, isPreview: false });
  });

  it("builds browser preview stats from confirmed and corrected sample trades", () => {
    const overview = createPreviewStatsOverview([
      {
        symbol: "ES",
        instrumentName: "E-mini S&P 500",
        openedAt: "2026-06-08T14:41:00.000Z",
        netPnl: 445,
        feesTotal: 5,
        rMultiple: 2.225,
        entryRuleId: null,
        aiReviewStatus: "confirmed",
      },
      {
        symbol: "MES",
        instrumentName: "Micro E-mini S&P 500",
        openedAt: "2026-06-06T13:57:00.000Z",
        netPnl: -16.5,
        feesTotal: 1.5,
        rMultiple: -1.32,
        entryRuleId: null,
        aiReviewStatus: "corrected",
      },
      {
        symbol: "NQ",
        instrumentName: "E-mini Nasdaq-100",
        openedAt: "2026-06-05T13:57:00.000Z",
        netPnl: 100,
        feesTotal: 2,
        rMultiple: 1,
        entryRuleId: null,
        aiReviewStatus: "needs_review",
      },
    ]);

    expect(overview).toEqual({
      totalTradeCount: 3,
      confirmedReviewCount: 2,
      totalNetPnl: 428.5,
      winRate: 0.5,
      averageRMultiple: 0.4525,
      profitFactor: 445 / 16.5,
      totalFees: 6.5,
      byInstrument: [
        expect.objectContaining({
          symbol: "ES",
          tradeCount: 1,
          netPnl: 445,
          winRate: 1,
        }),
        expect.objectContaining({
          symbol: "MES",
          tradeCount: 1,
          netPnl: -16.5,
          winRate: 0,
        }),
      ],
    });
  });

  it("filters browser preview stats by symbol and date window", () => {
    const overview = createPreviewStatsOverview(
      [
        {
          symbol: "ES",
          instrumentName: "E-mini S&P 500",
          openedAt: "2026-06-08T14:41:00.000Z",
          netPnl: 445,
          feesTotal: 5,
          rMultiple: 2.225,
          entryRuleId: null,
          aiReviewStatus: "confirmed",
        },
        {
          symbol: "ES",
          instrumentName: "E-mini S&P 500",
          openedAt: "2026-05-30T14:41:00.000Z",
          netPnl: 100,
          feesTotal: 2,
          rMultiple: 1,
          entryRuleId: null,
          aiReviewStatus: "confirmed",
        },
        {
          symbol: "MNQ",
          instrumentName: "Micro E-mini Nasdaq-100",
          openedAt: "2026-06-08T15:18:00.000Z",
          netPnl: 92.4,
          feesTotal: 3.6,
          rMultiple: 1.925,
          entryRuleId: null,
          aiReviewStatus: "confirmed",
        },
      ],
      {
        symbol: "ES",
        dateBasis: "user_local_day",
        dateFrom: "2026-06-01",
        dateBefore: "2026-06-11",
      },
    );

    expect(overview).toEqual(
      expect.objectContaining({
        totalTradeCount: 1,
        confirmedReviewCount: 1,
        totalNetPnl: 445,
        byInstrument: [
          expect.objectContaining({
            symbol: "ES",
            tradeCount: 1,
          }),
        ],
      }),
    );
  });

  it("filters browser preview stats by entry rule", () => {
    const overview = createPreviewStatsOverview(
      [
        {
          id: 1,
          symbol: "ES",
          instrumentName: "E-mini S&P 500",
          openedAt: "2026-06-08T14:41:00.000Z",
          netPnl: 445,
          feesTotal: 5,
          rMultiple: 2.225,
          entryRuleId: 10,
          aiReviewStatus: "confirmed",
        },
        {
          id: 2,
          symbol: "MNQ",
          instrumentName: "Micro E-mini Nasdaq-100",
          openedAt: "2026-06-08T15:18:00.000Z",
          netPnl: 92.4,
          feesTotal: 3.6,
          rMultiple: 1.925,
          entryRuleId: 20,
          aiReviewStatus: "confirmed",
        },
      ],
      {
        entryRuleId: 10,
      },
    );

    expect(overview).toEqual(
      expect.objectContaining({
        totalTradeCount: 1,
        confirmedReviewCount: 1,
        totalNetPnl: 445,
        byInstrument: [
          expect.objectContaining({
            symbol: "ES",
          }),
        ],
      }),
    );
  });

  it("falls back to empty desktop stats before the first IPC load", () => {
    expect(
      getStatsPanelState({
        runtime: "electron",
        overview: null,
        trades: [],
      }),
    ).toEqual({ overview: createEmptyStatsOverview(), isPreview: false });
  });

  it("formats nullable metrics for compact display", () => {
    expect(formatCurrency(537.4)).toBe("$537.40");
    expect(formatCurrency(-16.5)).toBe("-$16.50");
    expect(formatPercent(0.625)).toBe("62.5%");
    expect(formatPercent(null)).toBe("--");
    expect(formatRatio(2.075, "R")).toBe("2.08R");
    expect(formatRatio(null)).toBe("--");
  });

  it("builds API filters from date presets and custom fields", () => {
    expect(
      buildStatsOverviewFilters(
        {
          ...getInitialStatsFilterState(),
          dateRangePreset: "last7",
          symbol: "MNQ",
          entryRuleId: "42",
        },
        new Date("2026-06-11T10:30:00.000Z"),
      ),
    ).toEqual({
      symbol: "MNQ",
      entryRuleId: 42,
      dateBasis: "user_local_day",
      dateFrom: "2026-06-05",
      dateBefore: "2026-06-12",
    });

    expect(
      buildStatsOverviewFilters(
        {
          dateRangePreset: "custom",
          dateBasis: "market_session_day",
          symbol: "",
          entryRuleId: "",
          customFrom: "2026-06-01",
          customTo: "2026-06-10",
        },
        new Date("2026-06-11T10:30:00.000Z"),
      ),
    ).toEqual({
      dateBasis: "market_session_day",
      dateFrom: "2026-06-01",
      dateBefore: "2026-06-11",
    });
  });

  it("filters trades for stats drilldown using the same stats filter shape", () => {
    const trades = [
      {
        id: 1,
        symbol: "ES",
        instrumentName: "E-mini S&P 500",
        openedAt: "2026-06-08T14:41:00.000Z",
        netPnl: 445,
        feesTotal: 5,
        rMultiple: 2.225,
        entryRuleId: 10,
        aiReviewStatus: "confirmed" as const,
      },
      {
        id: 2,
        symbol: "MNQ",
        instrumentName: "Micro E-mini Nasdaq-100",
        openedAt: "2026-06-08T15:18:00.000Z",
        netPnl: 92.4,
        feesTotal: 3.6,
        rMultiple: 1.925,
        entryRuleId: 20,
        aiReviewStatus: "confirmed" as const,
      },
      {
        id: 3,
        symbol: "ES",
        instrumentName: "E-mini S&P 500",
        openedAt: "2026-05-30T14:41:00.000Z",
        netPnl: 100,
        feesTotal: 2,
        rMultiple: 1,
        entryRuleId: 10,
        aiReviewStatus: "confirmed" as const,
      },
    ];

    expect(
      filterTradesForStatsDrilldown(trades, {
        symbol: "ES",
        entryRuleId: 10,
        dateBasis: "user_local_day",
        dateFrom: "2026-06-01",
        dateBefore: "2026-06-11",
      }).map((trade) => trade.id),
    ).toEqual([1]);
  });

  it("filters preview trades by market session day", () => {
    const trades = [
      {
        id: 1,
        symbol: "ES",
        instrumentName: "E-mini S&P 500",
        openedAt: "2026-06-11T20:30:00.000Z",
        userLocalDate: "2026-06-11",
        marketSessionDate: "2026-06-11",
        netPnl: 100,
        feesTotal: 2,
        rMultiple: 1,
        entryRuleId: null,
        aiReviewStatus: "confirmed" as const,
      },
      {
        id: 2,
        symbol: "ES",
        instrumentName: "E-mini S&P 500",
        openedAt: "2026-06-11T22:30:00.000Z",
        userLocalDate: "2026-06-11",
        marketSessionDate: "2026-06-12",
        netPnl: 200,
        feesTotal: 2,
        rMultiple: 2,
        entryRuleId: null,
        aiReviewStatus: "confirmed" as const,
      },
    ];

    expect(
      filterTradesForStatsDrilldown(trades, {
        dateBasis: "market_session_day",
        dateFrom: "2026-06-12",
        dateBefore: "2026-06-13",
      }).map((trade) => trade.id),
    ).toEqual([2]);
  });

  it("builds entry rule filter options from active rules and historical trades", () => {
    const options = createStatsEntryRuleOptions(
      [
        {
          id: 10,
          name: "Opening range pullback",
          description: null,
          marketType: "index_futures",
          status: "active",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          latestVersion: {
            id: 100,
            entryRuleId: 10,
            versionNo: 1,
            content: "Trade pullbacks.",
            checklist: [],
            createdAt: "2026-06-01T00:00:00.000Z",
          },
        },
      ],
      [
        {
          entryRuleId: 10,
          entryRuleName: "Opening range pullback",
        },
        {
          entryRuleId: 20,
          entryRuleName: "Archived reversal",
        },
        {
          entryRuleId: null,
          entryRuleName: null,
        },
      ],
    );

    expect(options).toEqual([
      { id: 10, label: "Opening range pullback", source: "active" },
      { id: 20, label: "Archived reversal (历史)", source: "historical" },
    ]);
  });
});
