import { describe, expect, it } from "vitest";
import {
  buildCreateClosedTradeInput,
  calculateTradeFormPreview,
  createInitialTradeForm,
  createTradeFormFromDetail,
  createTradeFormAfterSave,
  parseLocalDateTimeToIso,
  type TradeFormState,
} from "./tradeForm";

const completeTradeForm: TradeFormState = {
  symbol: "ES",
  direction: "long",
  openedAt: "2026-06-08T14:41",
  closedAt: "2026-06-08T15:20",
  entryPrice: "5300",
  exitPrice: "5304.5",
  quantity: "2",
  stopLossPrice: "5298",
  takeProfitPrice: "5306",
  feesTotal: "5",
  entryReason: "Opening range pullback",
  exitReason: "Scaled out at target area",
  entryRuleVersionId: "3",
};

describe("trade form helpers", () => {
  it("calculates preview from instrument configuration instead of a local point-value map", () => {
    expect(
      calculateTradeFormPreview(
        {
          ...completeTradeForm,
          entryPrice: "12",
          exitPrice: "14",
          stopLossPrice: "11",
          quantity: "2",
          feesTotal: "0",
        },
        [
          {
            symbol: "ES",
            name: "Custom ES",
            assetClass: "futures",
            exchange: "CME",
            currency: "USD",
            tickSize: 0.25,
            tickValue: 25,
            pointValue: 100,
          },
        ],
      ),
    ).toEqual({
      pointPnl: 2,
      grossPnl: 400,
      netPnl: 400,
      riskAmount: 200,
      rMultiple: 2,
    });
  });

  it("treats datetime-local values as the user's local time before storing ISO", () => {
    const localValue = "2026-06-08T14:41";

    expect(parseLocalDateTimeToIso(localValue)).toBe(
      new Date(2026, 5, 8, 14, 41).toISOString(),
    );
  });

  it("rejects datetime-local values that roll over to another date", () => {
    expect(() => parseLocalDateTimeToIso("2026-02-31T14:41")).toThrow(
      "Invalid datetime-local value.",
    );
  });

  it("creates initial form times from the current local time", () => {
    const form = createInitialTradeForm(new Date(2026, 8, 5, 9, 7));

    expect(form.openedAt).toBe("2026-09-05T09:07");
    expect(form.closedAt).toBe("2026-09-05T09:37");
    expect(form.entryPrice).toBe("");
    expect(form.exitPrice).toBe("");
  });

  it("resets after save while keeping workflow defaults from the previous trade", () => {
    const form = createTradeFormAfterSave(
      {
        ...completeTradeForm,
        symbol: "MNQ",
        direction: "short",
        feesTotal: "3.6",
        entryReason: "previous setup",
      },
      new Date(2026, 8, 5, 9, 7),
    );

    expect(form).toMatchObject({
      symbol: "MNQ",
      direction: "short",
      openedAt: "2026-09-05T09:07",
      closedAt: "2026-09-05T09:37",
      entryPrice: "",
      exitPrice: "",
      stopLossPrice: "",
      takeProfitPrice: "",
      feesTotal: "3.6",
      entryReason: "",
      exitReason: "",
    });
  });

  it("creates an editable form from a persisted trade detail", () => {
    const detail: TradeDetail = {
      id: 1,
      symbol: "MNQ",
      instrumentName: "Micro E-mini Nasdaq-100",
      direction: "short",
      status: "closed",
      openedAt: new Date(2026, 8, 5, 9, 7).toISOString(),
      closedAt: new Date(2026, 8, 5, 9, 37).toISOString(),
      entryPriceAvg: 19000,
      exitPriceAvg: 18984,
      quantity: 3,
      stopLossPrice: 19008,
      takeProfitPrice: null,
      feesTotal: 3.6,
      grossPnl: 96,
      netPnl: 92.4,
      riskAmount: 48,
      rMultiple: 1.925,
      backgroundNote: null,
      entryReason: "Failed breakout",
      exitReason: "Covered near target",
      emotionNote: null,
      lessonNote: null,
      entryRuleId: 10,
      entryRuleVersionId: 12,
      entryRuleName: "Trend continuation",
      entryRuleVersionNo: 2,
      entryRuleContent: "Trade continuation after pullback.",
      entryRuleChecklist: ["Higher low held"],
      ruleChecks: [],
      aiReviewStatus: "not_generated",
      executions: [],
    };

    expect(createTradeFormFromDetail(detail)).toEqual({
      symbol: "MNQ",
      direction: "short",
      openedAt: "2026-09-05T09:07",
      closedAt: "2026-09-05T09:37",
      entryPrice: "19000",
      exitPrice: "18984",
      quantity: "3",
      stopLossPrice: "19008",
      takeProfitPrice: "",
      feesTotal: "3.6",
      entryReason: "Failed breakout",
      exitReason: "Covered near target",
      entryRuleVersionId: "12",
    });
  });

  it("builds a closed trade input with parsed numbers and nullable take profit", () => {
    const result = buildCreateClosedTradeInput({
      ...completeTradeForm,
      takeProfitPrice: "",
    });

    expect(result).toEqual({
      ok: true,
      input: {
        symbol: "ES",
        direction: "long",
        openedAt: new Date(2026, 5, 8, 14, 41).toISOString(),
        closedAt: new Date(2026, 5, 8, 15, 20).toISOString(),
        entryPrice: 5300,
        exitPrice: 5304.5,
        quantity: 2,
        stopLossPrice: 5298,
        takeProfitPrice: null,
        feesTotal: 5,
        entryReason: "Opening range pullback",
        exitReason: "Scaled out at target area",
        entryRuleVersionId: 3,
      },
    });
  });

  it("builds a closed trade input with no rule binding when the rule selection is blank", () => {
    const result = buildCreateClosedTradeInput({
      ...completeTradeForm,
      entryRuleVersionId: "",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        input: expect.objectContaining({
          entryRuleVersionId: null,
        }),
      }),
    );
  });

  it("returns Chinese validation errors before the Electron IPC call", () => {
    const result = buildCreateClosedTradeInput({
      ...completeTradeForm,
      openedAt: "",
      closedAt: "2026-06-08T14:00",
      entryPrice: "0",
      quantity: "1.5",
      feesTotal: "-1",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "请填写开仓时间。",
        "入场点位必须大于 0。",
        "合约数必须是正整数。",
        "手续费不能为负数。",
      ],
    });
  });

  it("validates stop-loss direction for long and short trades", () => {
    expect(
      buildCreateClosedTradeInput({
        ...completeTradeForm,
        direction: "long",
        stopLossPrice: "5300",
      }),
    ).toEqual({
      ok: false,
      errors: ["做多交易的止损点位必须低于入场点位。"],
    });

    expect(
      buildCreateClosedTradeInput({
        ...completeTradeForm,
        direction: "short",
        stopLossPrice: "5299",
      }),
    ).toEqual({
      ok: false,
      errors: ["做空交易的止损点位必须高于入场点位。"],
    });
  });
});
