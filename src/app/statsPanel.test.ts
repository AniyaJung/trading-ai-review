import { describe, expect, it } from "vitest";
import {
  buildStatsOverviewFilters,
  createEmptyStatsOverview,
  createPreviewStatsOverview,
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
        aiReviewStatus: "confirmed",
      },
      {
        symbol: "MES",
        instrumentName: "Micro E-mini S&P 500",
        openedAt: "2026-06-06T13:57:00.000Z",
        netPnl: -16.5,
        feesTotal: 1.5,
        rMultiple: -1.32,
        aiReviewStatus: "corrected",
      },
      {
        symbol: "NQ",
        instrumentName: "E-mini Nasdaq-100",
        openedAt: "2026-06-05T13:57:00.000Z",
        netPnl: 100,
        feesTotal: 2,
        rMultiple: 1,
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
          aiReviewStatus: "confirmed",
        },
        {
          symbol: "ES",
          instrumentName: "E-mini S&P 500",
          openedAt: "2026-05-30T14:41:00.000Z",
          netPnl: 100,
          feesTotal: 2,
          rMultiple: 1,
          aiReviewStatus: "confirmed",
        },
        {
          symbol: "MNQ",
          instrumentName: "Micro E-mini Nasdaq-100",
          openedAt: "2026-06-08T15:18:00.000Z",
          netPnl: 92.4,
          feesTotal: 3.6,
          rMultiple: 1.925,
          aiReviewStatus: "confirmed",
        },
      ],
      {
        symbol: "ES",
        openedFrom: "2026-06-01T00:00:00.000Z",
        openedBefore: "2026-06-11T00:00:00.000Z",
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
        },
        new Date("2026-06-11T10:30:00.000Z"),
      ),
    ).toEqual({
      symbol: "MNQ",
      openedFrom: "2026-06-05T00:00:00.000Z",
      openedBefore: "2026-06-12T00:00:00.000Z",
    });

    expect(
      buildStatsOverviewFilters(
        {
          dateRangePreset: "custom",
          symbol: "",
          customFrom: "2026-06-01",
          customTo: "2026-06-10",
        },
        new Date("2026-06-11T10:30:00.000Z"),
      ),
    ).toEqual({
      openedFrom: "2026-06-01T00:00:00.000Z",
      openedBefore: "2026-06-11T00:00:00.000Z",
    });
  });
});
