import { describe, expect, it } from "vitest";
import { mapTradeDetailRow } from "./tradeMappers";

const tradeDetailRow = {
  id: 1,
  symbol: "ES",
  instrumentName: "E-mini S&P 500",
  direction: "long",
  status: "closed",
  openedAt: "2026-06-12T01:00:00.000Z",
  closedAt: "2026-06-12T01:30:00.000Z",
  entryPriceAvg: 5400,
  exitPriceAvg: 5404,
  quantity: 1,
  stopLossPrice: 5396,
  takeProfitPrice: null,
  feesTotal: 4,
  grossPnl: 200,
  netPnl: 196,
  riskAmount: 200,
  rMultiple: 0.98,
  entryRuleId: 10,
  entryRuleVersionId: 20,
  entryRuleName: "Breakout",
  entryRuleVersionNo: 1,
  aiReviewStatus: "confirmed",
  entryRuleContent: "Trade the breakout.",
  entryRuleChecklistJson: JSON.stringify(["trend aligned", "risk defined"]),
  backgroundNote: null,
  entryReason: "breakout",
  exitReason: "target",
  emotionNote: null,
  lessonNote: null,
} satisfies Parameters<typeof mapTradeDetailRow>[0];

describe("tradeMappers", () => {
  it("maps a trade detail row with checklist, rule checks, and executions", () => {
    const detail = mapTradeDetailRow(
      tradeDetailRow,
      [
        {
          id: 100,
          entryRuleVersionId: 20,
          checkItem: "trend aligned",
          result: "pass",
          evidence: "higher highs",
          comment: null,
          scoreDelta: 1,
          createdAt: "2026-06-12T01:31:00.000Z",
        },
      ],
      [
        {
          id: 200,
          executedAt: "2026-06-12T01:00:00.000Z",
          side: "buy",
          price: 5400,
          quantity: 1,
          fee: 0,
          feeCurrency: "USD",
          executionType: "entry",
        },
      ],
    );

    expect(detail.entryRuleChecklist).toEqual([
      "trend aligned",
      "risk defined",
    ]);
    expect(detail.ruleChecks).toHaveLength(1);
    expect(detail.executions[0].executionType).toBe("entry");
  });

  it("uses an empty checklist when the rule version has no checklist JSON", () => {
    expect(
      mapTradeDetailRow(
        {
          ...tradeDetailRow,
          entryRuleChecklistJson: null,
        },
        [],
        [],
      ).entryRuleChecklist,
    ).toEqual([]);
  });
});
