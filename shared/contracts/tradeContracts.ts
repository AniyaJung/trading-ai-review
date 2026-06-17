import type { TradeDirection } from "../trading/types.js";
import type { ReviewStatus, TradeRuleCheckDetail } from "./reviewContracts.js";

export type CreateClosedTradeInput = {
  symbol: string;
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLossPrice: number;
  takeProfitPrice?: number | null;
  feesTotal: number;
  backgroundNote?: string | null;
  entryReason?: string | null;
  exitReason?: string | null;
  emotionNote?: string | null;
  lessonNote?: string | null;
  entryRuleVersionId?: number | null;
};

export type TradeSummary = {
  id: number;
  symbol: string;
  instrumentName: string;
  direction: TradeDirection;
  status: "closed";
  openedAt: string;
  userLocalDate?: string;
  marketSessionDate?: string;
  closedAt: string;
  entryPriceAvg: number;
  exitPriceAvg: number;
  quantity: number;
  feesTotal: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rMultiple: number | null;
  entryRuleId: number | null;
  entryRuleVersionId: number | null;
  entryRuleName: string | null;
  entryRuleVersionNo: number | null;
  tagIds?: number[];
  aiReviewStatus: "not_generated" | ReviewStatus;
};

export type TradeExecutionDetail = {
  id: number;
  executedAt: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string | null;
  executionType: "entry" | "exit" | "add" | "reduce";
};

export type TradeDetail = TradeSummary & {
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  backgroundNote: string | null;
  entryReason: string | null;
  exitReason: string | null;
  emotionNote: string | null;
  lessonNote: string | null;
  entryRuleContent: string | null;
  entryRuleChecklist: string[];
  ruleChecks: TradeRuleCheckDetail[];
  executions: TradeExecutionDetail[];
};
