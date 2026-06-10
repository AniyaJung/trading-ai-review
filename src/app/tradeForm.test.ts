import { describe, expect, it } from "vitest";
import {
  buildCreateClosedTradeInput,
  createInitialTradeForm,
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
};

describe("trade form helpers", () => {
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
      },
    });
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
