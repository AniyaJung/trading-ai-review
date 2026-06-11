import type { RendererRuntime } from "./tradeList";

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

export type StatsOverview = {
  totalTradeCount: number;
  confirmedReviewCount: number;
  totalNetPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  totalFees: number;
  byInstrument: InstrumentStats[];
};

export type StatsOverviewFilters = {
  symbol?: string;
  entryRuleId?: number;
  openedFrom?: string;
  openedBefore?: string;
};

export type StatsDateRangePreset = "all" | "last7" | "last30" | "custom";

export type StatsFilterState = {
  dateRangePreset: StatsDateRangePreset;
  symbol: string;
  entryRuleId: string;
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
  netPnl: number;
  feesTotal: number;
  rMultiple: number | null;
  entryRuleId: number | null;
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
    symbol: "",
    entryRuleId: "",
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
  };
}

export function createPreviewStatsOverview(
  trades: StatsTrade[],
  filters: StatsOverviewFilters = {},
): StatsOverview {
  const filteredTrades = filterStatsTrades(trades, filters);
  const reviewedTrades = filteredTrades.filter((trade) =>
    isReviewedTradeStatus(trade.aiReviewStatus),
  );

  return {
    totalTradeCount: filteredTrades.length,
    confirmedReviewCount: reviewedTrades.length,
    ...buildAggregate(reviewedTrades),
    byInstrument: groupByInstrument(reviewedTrades),
  };
}

export function buildStatsOverviewFilters(
  state: StatsFilterState,
  now = new Date(),
): StatsOverviewFilters {
  const filters: StatsOverviewFilters = {};

  if (state.symbol.trim()) {
    filters.symbol = state.symbol.trim();
  }

  const entryRuleId = Number(state.entryRuleId);
  if (Number.isInteger(entryRuleId) && entryRuleId > 0) {
    filters.entryRuleId = entryRuleId;
  }

  if (state.dateRangePreset === "last7") {
    filters.openedFrom = toUtcDateBoundary(addUtcDays(startOfUtcDay(now), -6));
    filters.openedBefore = toUtcDateBoundary(addUtcDays(startOfUtcDay(now), 1));
  }

  if (state.dateRangePreset === "last30") {
    filters.openedFrom = toUtcDateBoundary(addUtcDays(startOfUtcDay(now), -29));
    filters.openedBefore = toUtcDateBoundary(addUtcDays(startOfUtcDay(now), 1));
  }

  if (state.dateRangePreset === "custom") {
    if (state.customFrom) {
      filters.openedFrom = `${state.customFrom}T00:00:00.000Z`;
    }

    if (state.customTo) {
      filters.openedBefore = toUtcDateBoundary(
        addUtcDays(new Date(`${state.customTo}T00:00:00.000Z`), 1),
      );
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

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUtcDateBoundary(value: Date) {
  return value.toISOString();
}
