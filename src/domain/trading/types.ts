export type TradeDirection = "long" | "short";

export type ClosedFuturesTradeInput = {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  quantity: number;
  pointValue: number;
  feesTotal: number;
};

export type ClosedFuturesTradeCalculation = {
  pointPnl: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rMultiple: number | null;
};
