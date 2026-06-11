import { describe, expect, it } from "vitest";
import {
  getSelectedTradeDetail,
  getTradeScopedStateValue,
} from "./tradeDetailSelection";

const detail = {
  id: 1,
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
  stopLossPrice: null,
  takeProfitPrice: null,
  backgroundNote: null,
  entryReason: null,
  exitReason: null,
  emotionNote: null,
  lessonNote: null,
  entryRuleContent: null,
  entryRuleChecklist: [],
  ruleChecks: [],
  executions: [],
} satisfies TradeDetail;

describe("getSelectedTradeDetail", () => {
  it("does not treat two missing ids as a selected detail match", () => {
    expect(
      getSelectedTradeDetail({
        previewTradeDetail: undefined,
        selectedTrade: undefined,
        selectedTradeDetailState: undefined,
      }),
    ).toBeUndefined();
  });

  it("returns persisted detail only when it belongs to the selected trade", () => {
    expect(
      getSelectedTradeDetail({
        previewTradeDetail: undefined,
        selectedTrade: { ...detail, id: 1 },
        selectedTradeDetailState: { tradeId: 1, detail },
      }),
    ).toBe(detail);

    expect(
      getSelectedTradeDetail({
        previewTradeDetail: undefined,
        selectedTrade: { ...detail, id: 2 },
        selectedTradeDetailState: { tradeId: 1, detail },
      }),
    ).toBeUndefined();
  });

  it("prefers browser preview detail when provided", () => {
    expect(
      getSelectedTradeDetail({
        previewTradeDetail: detail,
        selectedTrade: undefined,
        selectedTradeDetailState: undefined,
      }),
    ).toBe(detail);
  });
});

describe("getTradeScopedStateValue", () => {
  it("does not match missing state to a missing selected trade", () => {
    expect(
      getTradeScopedStateValue({
        selectedTrade: undefined,
        state: undefined,
        readValue: (state: { tradeId: number; error: string }) => state.error,
      }),
    ).toBeUndefined();
  });

  it("returns the value only when the state belongs to the selected trade", () => {
    expect(
      getTradeScopedStateValue({
        selectedTrade: { ...detail, id: 1 },
        state: { tradeId: 1, error: "failed" },
        readValue: (state) => state.error,
      }),
    ).toBe("failed");

    expect(
      getTradeScopedStateValue({
        selectedTrade: { ...detail, id: 2 },
        state: { tradeId: 1, error: "failed" },
        readValue: (state) => state.error,
      }),
    ).toBeUndefined();
  });
});
