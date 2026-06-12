import { describe, expect, it } from "vitest";
import {
  createTradeWorkflowInitialState,
  getDeleteTradeConfirmationMessage,
  getTradeRuntimePreviewSaveMessage,
  getTradeValidationFailureMessage,
  resetTradeDetailStateForTrade,
} from "./tradeWorkflow";

const trade = {
  id: 7,
  symbol: "ES",
  instrumentName: "E-mini S&P 500",
  direction: "long",
  status: "closed",
  openedAt: "2026-06-12T01:00:00.000Z",
  closedAt: "2026-06-12T01:30:00.000Z",
  entryPriceAvg: 5400,
  exitPriceAvg: 5404,
  quantity: 1,
  feesTotal: 4,
  grossPnl: 200,
  netPnl: 196,
  riskAmount: 200,
  rMultiple: 0.98,
  entryRuleId: null,
  entryRuleVersionId: null,
  entryRuleName: null,
  entryRuleVersionNo: null,
  aiReviewStatus: "not_generated",
} satisfies TradeSummary;

describe("tradeWorkflow", () => {
  it("creates initial trade workflow state", () => {
    const state = createTradeWorkflowInitialState("electron", [trade]);

    expect(state.trades).toEqual([]);
    expect(state.formErrors).toEqual([]);
    expect(state.formMessage).toBe(
      "填写一笔已平仓交易，保存后会安全写入本机数据库。",
    );
    expect(state.editingTradeId).toBeNull();
    expect(state.tradeLoadError).toBeNull();
  });

  it("keeps trade workflow copy centralized", () => {
    expect(getTradeValidationFailureMessage()).toBe(
      "还有几项交易事实需要补全，请按提示修改后再保存。",
    );
    expect(getTradeRuntimePreviewSaveMessage()).toBe(
      "当前是浏览器预览，不会写入数据库；在桌面应用中保存才会落盘。",
    );
    expect(getDeleteTradeConfirmationMessage(trade)).toContain("确认删除 ES");
  });

  it("clears cached detail state for a deleted trade", () => {
    expect(
      resetTradeDetailStateForTrade(
        {
          tradeId: trade.id,
          detail: {
            ...trade,
            stopLossPrice: 5396,
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
          },
        },
        trade.id,
      ),
    ).toBeUndefined();
  });
});
