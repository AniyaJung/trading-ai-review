import type {
  ClosedFuturesTradeCalculation,
  ClosedFuturesTradeInput,
} from "./types.js";

const roundForStorage = (value: number) => Number(value.toFixed(6));

export function calculateClosedFuturesTrade(
  input: ClosedFuturesTradeInput,
): ClosedFuturesTradeCalculation {
  const pointPnl =
    input.direction === "long"
      ? input.exitPrice - input.entryPrice
      : input.entryPrice - input.exitPrice;
  const grossPnl = pointPnl * input.pointValue * input.quantity;
  const netPnl = grossPnl - input.feesTotal;
  const riskAmount =
    Math.abs(input.entryPrice - input.stopLossPrice) *
    input.pointValue *
    input.quantity;

  return {
    pointPnl: roundForStorage(pointPnl),
    grossPnl: roundForStorage(grossPnl),
    netPnl: roundForStorage(netPnl),
    riskAmount: roundForStorage(riskAmount),
    rMultiple: riskAmount > 0 ? roundForStorage(netPnl / riskAmount) : null,
  };
}
