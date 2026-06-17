export type InstrumentStats = {
  symbol: string;
  instrumentName: string;
  tradeCount: number;
  netPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  feesTotal: number;
};

export type TagCategory = "mistake" | "emotion" | "setup" | "market";

export type TagSummary = {
  id: number;
  name: string;
  category: TagCategory;
  tradeCount: number;
};

export type StatsOverview = {
  totalTradeCount: number;
  confirmedReviewCount: number;
  totalNetPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  totalFees: number;
  byInstrument: InstrumentStats[];
  byTag: TagSummary[];
};

export type StatsDateBasis = "user_local_day" | "market_session_day";

export type StatsOverviewFilters = {
  symbol?: string | null;
  entryRuleId?: number | null;
  tagId?: number | null;
  dateBasis?: StatsDateBasis | null;
  dateFrom?: string | null;
  dateBefore?: string | null;
  openedFrom?: string | null;
  openedBefore?: string | null;
};
