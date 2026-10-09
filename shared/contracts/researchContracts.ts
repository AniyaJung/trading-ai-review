import type { TradeSummary } from "./tradeContracts.js";

export type TradeResearchFields = {
  executionMode?: "live" | "paper" | "replay";
  recordTiming?: "pre_entry" | "during_trade" | "post_trade";
  studyPhase?: "discovery" | "validation" | "forward";
  setup?: string;
  confidence?: number;
  thesis?: string;
  expectedDirection?: "up" | "down" | "range";
  horizonSeconds?: number;
  invalidation?: string;
  session?: "asia" | "europe" | "us_open" | "us_midday" | "us_close";
  marketRegime?: "trend" | "range" | "transition";
  volatilityRegime?: "low" | "normal" | "high";
  directionalBias?: "bullish" | "bearish" | "neutral";
  vwapPosition?: "above" | "below" | "around";
  vwapDistancePoints?: number;
  atrPoints?: number;
  keyLevelNote?: string;
  newsContext?: "regular" | "scheduled_event" | "unscheduled_event";
  dataSource?: string;
  measurementWindow?: string;
  deltaConvention?: "ask_minus_bid" | "bid_minus_ask";
  volume?: number;
  bidVolume?: number;
  askVolume?: number;
  delta?: number;
  cumulativeDelta?: number;
  priceResponsePoints?: number;
  absorption?: "none" | "bid" | "ask" | "both";
  exhaustion?: "none" | "buy" | "sell";
  pocPrice?: number;
  vahPrice?: number;
  valPrice?: number;
  liquidityEvent?: "replenishment" | "pulling" | "adding" | "sweep" | "stable";
  bidDepth?: number;
  askDepth?: number;
  depthLevels?: number;
  spreadTicks?: number;
  domObservation?: string;
  maePoints?: number;
  mfePoints?: number;
  slippageTicks?: number;
  stopMoved?: "yes" | "no";
  targetMoved?: "yes" | "no";
  partialExit?: "yes" | "no";
  managementNote?: string;
  energy?: number;
  stress?: number;
  emotionNote?: string;
};

export type TradeResearchRecord = {
  tradeId: number;
  fields: TradeResearchFields;
  createdAt: string;
  updatedAt: string;
};

export type SaveTradeResearchInput = {
  tradeId: number;
  fields: TradeResearchFields;
};

export type TradeResearchSample = {
  trade: TradeSummary;
  record: TradeResearchRecord | undefined;
};
