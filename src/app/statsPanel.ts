import type { RendererRuntime } from "./tradeList";
import type {
  StatsDateBasis,
  StatsOverview,
  StatsOverviewFilters,
  TagSummary,
} from "../../shared/contracts/desktopApi";
import {
  addDaysToDateString,
  deriveTradeDateSemantics,
} from "../../shared/trading/tradeDates";

export type {
  InstrumentStats,
  StatsDateBasis,
  StatsOverview,
  StatsOverviewFilters,
  TagSummary,
} from "../../shared/contracts/desktopApi";

export type StatsDateRangePreset = "all" | "last7" | "last30" | "custom";

export type StatsFilterState = {
  dateRangePreset: StatsDateRangePreset;
  dateBasis: StatsDateBasis;
  symbol: string;
  entryRuleId: string;
  tagId: string;
  customFrom: string;
  customTo: string;
};

export type StatsEntryRuleOption = {
  id: number;
  label: string;
  source: "active" | "historical";
};

type StatsTrade = {
  id?: number;
  symbol: string;
  instrumentName: string;
  openedAt: string;
  userLocalDate?: string;
  marketSessionDate?: string;
  netPnl: number;
  feesTotal: number;
  rMultiple: number | null;
  entryRuleId: number | null;
  tagIds?: number[];
  tags?: Array<Pick<TagSummary, "id" | "name" | "category">>;
  aiReviewStatus: TradeSummary["aiReviewStatus"];
};

type StatsEntryRuleTrade = Pick<
  TradeSummary,
  "entryRuleId" | "entryRuleName"
>;

type StatsPanelStateInput = {
  runtime: RendererRuntime;
  overview: StatsOverview | null;
  trades: StatsTrade[];
  filters?: StatsOverviewFilters;
};

export function getStatsPanelState({
  runtime,
  overview,
  trades,
  filters,
}: StatsPanelStateInput) {
  if (overview) {
    return { overview, isPreview: false };
  }

  return {
    overview:
      runtime === "electron"
        ? createEmptyStatsOverview()
        : createPreviewStatsOverview(trades, filters),
    isPreview: runtime !== "electron",
  };
}

export function getInitialStatsFilterState(): StatsFilterState {
  return {
    dateRangePreset: "all",
    dateBasis: "user_local_day",
    symbol: "",
    entryRuleId: "",
    tagId: "",
    customFrom: "",
    customTo: "",
  };
}

export function createEmptyStatsOverview(): StatsOverview {
  return {
    totalTradeCount: 0,
    confirmedReviewCount: 0,
    totalNetPnl: 0,
    winRate: null,
    averageRMultiple: null,
    profitFactor: null,
    totalFees: 0,
    byInstrument: [],
    byTag: [],
  };
}

export function createPreviewStatsOverview(
  trades: StatsTrade[],
  filters: StatsOverviewFilters = {},
): StatsOverview {
  const filteredTrades = filterStatsTrades(trades, filters);
  const tagOptionFilters = { ...filters, tagId: null };
  const tagOptionTrades = filterStatsTrades(trades, tagOptionFilters).filter(
    (trade) => isReviewedTradeStatus(trade.aiReviewStatus),
  );
  const reviewedTrades = filteredTrades.filter((trade) =>
    isReviewedTradeStatus(trade.aiReviewStatus),
  );

  return {
    totalTradeCount: filteredTrades.length,
    confirmedReviewCount: reviewedTrades.length,
    ...buildAggregate(reviewedTrades),
    byInstrument: groupByInstrument(reviewedTrades),
    byTag: groupByTag(tagOptionTrades),
  };
}

export function buildStatsOverviewFilters(
  state: StatsFilterState,
  now = new Date(),
): StatsOverviewFilters {
  const filters: StatsOverviewFilters = {};
  filters.dateBasis = state.dateBasis;

  if (state.symbol.trim()) {
    filters.symbol = state.symbol.trim();
  }

  const entryRuleId = Number(state.entryRuleId);
  if (Number.isInteger(entryRuleId) && entryRuleId > 0) {
    filters.entryRuleId = entryRuleId;
  }

  const tagId = Number(state.tagId);
  if (Number.isInteger(tagId) && tagId > 0) {
    filters.tagId = tagId;
  }

  if (state.dateRangePreset === "last7") {
    const currentDate = getCurrentStatsDate(state.dateBasis, now);
    filters.dateFrom = addDaysToDateString(currentDate, -6);
    filters.dateBefore = addDaysToDateString(currentDate, 1);
  }

  if (state.dateRangePreset === "last30") {
    const currentDate = getCurrentStatsDate(state.dateBasis, now);
    filters.dateFrom = addDaysToDateString(currentDate, -29);
    filters.dateBefore = addDaysToDateString(currentDate, 1);
  }

  if (state.dateRangePreset === "custom") {
    if (state.customFrom) {
      filters.dateFrom = state.customFrom;
    }

    if (state.customTo) {
      filters.dateBefore = addDaysToDateString(state.customTo, 1);
    }
  }

  return filters;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null) {
  if (value == null) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRatio(value: number | null, suffix = "") {
  if (value == null) {
    return "--";
  }

  return `${value.toFixed(2)}${suffix}`;
}

export function filterTradesForStatsDrilldown<T extends StatsTrade>(
  trades: T[],
  filters: StatsOverviewFilters,
): T[] {
  return filterStatsTrades(trades, filters);
}

export function createStatsEntryRuleOptions(
  activeRules: EntryRuleWithLatestVersion[],
  trades: StatsEntryRuleTrade[],
): StatsEntryRuleOption[] {
  const options = new Map<number, StatsEntryRuleOption>();

  for (const rule of activeRules) {
    options.set(rule.id, {
      id: rule.id,
      label: rule.name,
      source: "active",
    });
  }

  for (const trade of trades) {
    if (trade.entryRuleId == null || options.has(trade.entryRuleId)) {
      continue;
    }

    options.set(trade.entryRuleId, {
      id: trade.entryRuleId,
      label: `${trade.entryRuleName ?? `规则 ${trade.entryRuleId}`} (历史)`,
      source: "historical",
    });
  }

  return [...options.values()];
}

function isReviewedTradeStatus(status: TradeSummary["aiReviewStatus"]) {
  return status === "confirmed" || status === "corrected";
}

function filterStatsTrades<T extends StatsTrade>(
  trades: T[],
  filters: StatsOverviewFilters,
): T[] {
  return trades.filter((trade) => {
    if (filters.symbol && trade.symbol !== filters.symbol) {
      return false;
    }

    if (
      filters.entryRuleId != null &&
      trade.entryRuleId !== filters.entryRuleId
    ) {
      return false;
    }

    if (filters.tagId != null && !(trade.tagIds ?? []).includes(filters.tagId)) {
      return false;
    }

    if (filters.dateFrom && getTradeStatsDate(trade, filters) < filters.dateFrom) {
      return false;
    }

    if (
      filters.dateBefore &&
      getTradeStatsDate(trade, filters) >= filters.dateBefore
    ) {
      return false;
    }

    if (filters.openedFrom && trade.openedAt < filters.openedFrom) {
      return false;
    }

    if (filters.openedBefore && trade.openedAt >= filters.openedBefore) {
      return false;
    }

    return true;
  });
}

function buildAggregate(trades: StatsTrade[]) {
  const tradeCount = trades.length;
  const totalNetPnl = sum(trades.map((trade) => trade.netPnl));
  const totalFees = sum(trades.map((trade) => trade.feesTotal));
  const rMultiples = trades
    .map((trade) => trade.rMultiple)
    .filter((value): value is number => value != null);

  return {
    totalNetPnl: roundMoney(totalNetPnl),
    winRate:
      tradeCount === 0
        ? null
        : trades.filter((trade) => trade.netPnl > 0).length / tradeCount,
    averageRMultiple:
      rMultiples.length === 0
        ? null
        : roundRatio(sum(rMultiples) / rMultiples.length),
    profitFactor: calculateProfitFactor(trades),
    totalFees: roundMoney(totalFees),
  };
}

function groupByInstrument(trades: StatsTrade[]): InstrumentStats[] {
  const groups = new Map<string, StatsTrade[]>();

  for (const trade of trades) {
    groups.set(trade.symbol, [...(groups.get(trade.symbol) ?? []), trade]);
  }

  return [...groups.entries()]
    .map(([symbol, instrumentTrades]) => {
      const aggregate = buildAggregate(instrumentTrades);
      return {
        symbol,
        instrumentName: instrumentTrades[0].instrumentName,
        tradeCount: instrumentTrades.length,
        netPnl: aggregate.totalNetPnl,
        winRate: aggregate.winRate,
        averageRMultiple: aggregate.averageRMultiple,
        profitFactor: aggregate.profitFactor,
        feesTotal: aggregate.totalFees,
      };
    })
    .sort((left, right) => right.netPnl - left.netPnl || left.symbol.localeCompare(right.symbol));
}

function groupByTag(trades: StatsTrade[]): TagSummary[] {
  const groups = new Map<number, TagSummary>();

  for (const trade of trades) {
    for (const tag of getTradeTags(trade)) {
      const existing = groups.get(tag.id);
      groups.set(tag.id, {
        id: tag.id,
        name: tag.name,
        category: tag.category,
        tradeCount: (existing?.tradeCount ?? 0) + 1,
      });
    }
  }

  return [...groups.values()].sort(
    (left, right) => right.tradeCount - left.tradeCount || left.name.localeCompare(right.name),
  );
}

function getTradeTags(
  trade: StatsTrade,
): Array<Pick<TagSummary, "id" | "name" | "category">> {
  if (trade.tags && trade.tags.length > 0) {
    return dedupeTags(trade.tags);
  }

  return dedupeTags(
    (trade.tagIds ?? []).map((id) => ({
      id,
      name: `标签 ${id}`,
      category: "setup" as const,
    })),
  );
}

function dedupeTags(
  tags: Array<Pick<TagSummary, "id" | "name" | "category">>,
) {
  const seen = new Set<number>();
  const result: Array<Pick<TagSummary, "id" | "name" | "category">> = [];

  for (const tag of tags) {
    if (seen.has(tag.id)) {
      continue;
    }

    seen.add(tag.id);
    result.push(tag);
  }

  return result;
}

function calculateProfitFactor(trades: StatsTrade[]) {
  const grossProfit = sum(
    trades.filter((trade) => trade.netPnl > 0).map((trade) => trade.netPnl),
  );
  const grossLoss = Math.abs(
    sum(trades.filter((trade) => trade.netPnl < 0).map((trade) => trade.netPnl)),
  );

  if (grossLoss <= 0) {
    return null;
  }

  return grossProfit / grossLoss;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(10));
}

function roundRatio(value: number) {
  return Number(value.toFixed(10));
}

function getCurrentStatsDate(dateBasis: StatsDateBasis, now: Date) {
  const dates = deriveTradeDateSemantics(now.toISOString());
  return dateBasis === "market_session_day"
    ? dates.marketSessionDate
    : dates.userLocalDate;
}

function getTradeStatsDate(
  trade: StatsTrade,
  filters: StatsOverviewFilters,
) {
  const dateBasis = filters.dateBasis ?? "user_local_day";

  if (dateBasis === "market_session_day") {
    return (
      trade.marketSessionDate ??
      deriveTradeDateSemantics(trade.openedAt).marketSessionDate
    );
  }

  return (
    trade.userLocalDate ?? deriveTradeDateSemantics(trade.openedAt).userLocalDate
  );
}
