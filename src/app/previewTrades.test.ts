import { describe, expect, it } from "vitest";
import {
  createPreviewTradeDetail,
  formatStatsDrilldownLabel,
  updatePreviewTradeSummary,
} from "./previewTrades";

const trade: TradeSummary = {
  id: 7,
  symbol: "ES",
  instrumentName: "E-mini S&P 500",
  direction: "long",
  status: "closed",
  openedAt: "2026-06-08T14:41:00.000Z",
  closedAt: "2026-06-08T15:20:00.000Z",
  entryPriceAvg: 5300,
  exitPriceAvg: 5304.5,
  quantity: 2,
  feesTotal: 5,
  grossPnl: 450,
  netPnl: 445,
  riskAmount: 200,
  rMultiple: 2.225,
  entryRuleId: null,
  entryRuleVersionId: null,
  entryRuleName: null,
  entryRuleVersionNo: null,
  aiReviewStatus: "needs_review",
};

describe("previewTrades", () => {
  it("creates preview trade details with entry and exit executions", () => {
    const detail = createPreviewTradeDetail(trade);

    expect(detail.executions).toEqual([
      expect.objectContaining({
        id: 71,
        executionType: "entry",
        side: "buy",
        price: 5300,
      }),
      expect.objectContaining({
        id: 72,
        executionType: "exit",
        side: "sell",
        price: 5304.5,
        fee: 5,
      }),
    ]);
    expect(detail.ruleChecks).toEqual([]);
  });

  it("updates only the matching preview trade summary", () => {
    const next = updatePreviewTradeSummary(
      [trade, { ...trade, id: 8, symbol: "MNQ" }],
      7,
      {
        symbol: "MES",
        direction: "short",
        openedAt: "2026-06-09T14:41:00.000Z",
        closedAt: "2026-06-09T15:20:00.000Z",
        entryPrice: 5301,
        exitPrice: 5299,
        quantity: 1,
        stopLossPrice: 5303,
        feesTotal: 2,
      },
      {
        grossPnl: 10,
        netPnl: 8,
        riskAmount: 5,
        rMultiple: 1.6,
      },
    );

    expect(next[0]).toEqual(
      expect.objectContaining({
        symbol: "MES",
        direction: "short",
        entryPriceAvg: 5301,
        grossPnl: 10,
        rMultiple: 1.6,
      }),
    );
    expect(next[1].symbol).toBe("MNQ");
  });

  it("formats stats drilldown labels with symbol, rule, and date range", () => {
    expect(
      formatStatsDrilldownLabel(
        {
          symbol: "ES",
          entryRuleId: 2,
          tagId: 7,
          openedFrom: "2026-06-01T00:00:00.000Z",
          openedBefore: "2026-06-08T00:00:00.000Z",
        },
        [{ id: 2, label: "ORB v1", source: "active" }],
        [{ id: 7, name: "late-entry", category: "setup", tradeCount: 1 }],
      ),
    ).toContain("统计筛选 / ES / ORB v1 / late-entry");
  });
});
