import { describe, expect, it } from "vitest";
import { calculateClosedFuturesTrade } from "./futuresMath";

describe("calculateClosedFuturesTrade", () => {
  it("calculates ES long net PnL and R multiple", () => {
    const result = calculateClosedFuturesTrade({
      direction: "long",
      entryPrice: 5300,
      exitPrice: 5304.5,
      stopLossPrice: 5298,
      quantity: 2,
      pointValue: 50,
      feesTotal: 5,
    });

    expect(result.pointPnl).toBe(4.5);
    expect(result.grossPnl).toBe(450);
    expect(result.netPnl).toBe(445);
    expect(result.riskAmount).toBe(200);
    expect(result.rMultiple).toBe(2.225);
  });

  it("calculates MNQ short net PnL and R multiple", () => {
    const result = calculateClosedFuturesTrade({
      direction: "short",
      entryPrice: 19000,
      exitPrice: 18984,
      stopLossPrice: 19008,
      quantity: 3,
      pointValue: 2,
      feesTotal: 3.6,
    });

    expect(result.pointPnl).toBe(16);
    expect(result.grossPnl).toBe(96);
    expect(result.netPnl).toBe(92.4);
    expect(result.riskAmount).toBe(48);
    expect(result.rMultiple).toBe(1.925);
  });
});
