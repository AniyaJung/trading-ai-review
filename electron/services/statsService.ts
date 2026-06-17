import type { DatabaseSync } from "node:sqlite";
import type {
  InstrumentStats,
  StatsOverview,
  StatsOverviewFilters,
} from "../../shared/contracts/desktopApi.js";
import {
  getInstrumentAggregates,
  getReviewedAggregate,
  getTagAggregates,
  getTradeCount,
  type AggregateRow,
  type InstrumentAggregateRow,
} from "./statsAggregates.js";
import { buildTradeFilterClause } from "./statsFilters.js";

export type {
  InstrumentStats,
  StatsOverview,
  StatsOverviewFilters,
} from "../../shared/contracts/desktopApi.js";

export function getStatsOverview(
  db: DatabaseSync,
  filters: StatsOverviewFilters = {},
): StatsOverview {
  const queryFilters = buildTradeFilterClause(filters);
  const tagOptionFilters = buildTradeFilterClause(filters, {
    includeTagFilter: false,
  });
  const totalTradeCount = getTradeCount(db, queryFilters);
  const aggregate = getReviewedAggregate(db, queryFilters);

  return {
    totalTradeCount,
    confirmedReviewCount: aggregate.tradeCount,
    totalNetPnl: roundMoney(aggregate.netPnl ?? 0),
    winRate: calculateWinRate(aggregate),
    averageRMultiple: calculateAverageRMultiple(aggregate),
    profitFactor: calculateProfitFactor(aggregate),
    totalFees: roundMoney(aggregate.feesTotal ?? 0),
    byInstrument: getInstrumentAggregates(db, queryFilters).map(mapInstrumentStats),
    byTag: getTagAggregates(db, tagOptionFilters),
  };
}

function mapInstrumentStats(row: InstrumentAggregateRow): InstrumentStats {
  return {
    symbol: row.symbol,
    instrumentName: row.instrumentName,
    tradeCount: row.tradeCount,
    netPnl: roundMoney(row.netPnl ?? 0),
    winRate: calculateWinRate(row),
    averageRMultiple: calculateAverageRMultiple(row),
    profitFactor: calculateProfitFactor(row),
    feesTotal: roundMoney(row.feesTotal ?? 0),
  };
}

function calculateWinRate(row: AggregateRow) {
  if (row.tradeCount === 0) {
    return null;
  }

  return row.winningTradeCount / row.tradeCount;
}

function calculateAverageRMultiple(row: AggregateRow) {
  if (row.rMultipleCount === 0) {
    return null;
  }

  return roundRatio((row.rMultipleTotal ?? 0) / row.rMultipleCount);
}

function calculateProfitFactor(row: AggregateRow) {
  const grossLoss = row.grossLoss ?? 0;

  if (grossLoss <= 0) {
    return null;
  }

  return (row.grossProfit ?? 0) / grossLoss;
}

function roundMoney(value: number) {
  return Number(value.toFixed(10));
}

function roundRatio(value: number) {
  return Number(value.toFixed(10));
}
