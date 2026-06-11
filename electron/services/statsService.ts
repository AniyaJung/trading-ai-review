import type { DatabaseSync } from "node:sqlite";

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
  symbol?: string | null;
  openedFrom?: string | null;
  openedBefore?: string | null;
};

type AggregateRow = {
  tradeCount: number;
  netPnl: number | null;
  winningTradeCount: number;
  rMultipleCount: number;
  rMultipleTotal: number | null;
  grossProfit: number | null;
  grossLoss: number | null;
  feesTotal: number | null;
};

type InstrumentAggregateRow = AggregateRow & {
  symbol: string;
  instrumentName: string;
};

const reviewedStatusSql = "('confirmed', 'corrected')";

export function getStatsOverview(
  db: DatabaseSync,
  filters: StatsOverviewFilters = {},
): StatsOverview {
  const queryFilters = buildTradeFilterClause(filters);
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
  };
}

type TradeFilterClause = {
  sql: string;
  params: Array<number | string>;
};

function buildTradeFilterClause(filters: StatsOverviewFilters): TradeFilterClause {
  const clauses = ["trade.status = 'closed'"];
  const params: string[] = [];

  if (filters.symbol?.trim()) {
    clauses.push("instrument.symbol = ?");
    params.push(filters.symbol.trim());
  }

  if (filters.openedFrom?.trim()) {
    clauses.push("trade.opened_at >= ?");
    params.push(filters.openedFrom.trim());
  }

  if (filters.openedBefore?.trim()) {
    clauses.push("trade.opened_at < ?");
    params.push(filters.openedBefore.trim());
  }

  return {
    sql: clauses.join("\n        and "),
    params,
  };
}

function getTradeCount(db: DatabaseSync, filters: TradeFilterClause) {
  const row = db
    .prepare(
      `select count(*) as count
       from trade
       join instrument on instrument.id = trade.instrument_id
       where ${filters.sql}`,
    )
    .get(...filters.params) as { count: number };

  return Number(row.count);
}

function getReviewedAggregate(
  db: DatabaseSync,
  filters: TradeFilterClause,
): AggregateRow {
  return db
    .prepare(
      `select
        count(*) as tradeCount,
        sum(net_pnl) as netPnl,
        sum(case when net_pnl > 0 then 1 else 0 end) as winningTradeCount,
        count(r_multiple) as rMultipleCount,
        sum(r_multiple) as rMultipleTotal,
        sum(case when net_pnl > 0 then net_pnl else 0 end) as grossProfit,
        sum(case when net_pnl < 0 then abs(net_pnl) else 0 end) as grossLoss,
        sum(fees_total) as feesTotal
      from trade
      join instrument on instrument.id = trade.instrument_id
      where ${filters.sql}
        and trade.ai_review_status in ${reviewedStatusSql}`,
    )
    .get(...filters.params) as AggregateRow;
}

function getInstrumentAggregates(
  db: DatabaseSync,
  filters: TradeFilterClause,
): InstrumentAggregateRow[] {
  return db
    .prepare(
      `select
        instrument.symbol,
        instrument.name as instrumentName,
        count(*) as tradeCount,
        sum(trade.net_pnl) as netPnl,
        sum(case when trade.net_pnl > 0 then 1 else 0 end) as winningTradeCount,
        count(trade.r_multiple) as rMultipleCount,
        sum(trade.r_multiple) as rMultipleTotal,
        sum(case when trade.net_pnl > 0 then trade.net_pnl else 0 end) as grossProfit,
        sum(case when trade.net_pnl < 0 then abs(trade.net_pnl) else 0 end) as grossLoss,
        sum(trade.fees_total) as feesTotal
      from trade
      join instrument on instrument.id = trade.instrument_id
      where ${filters.sql}
        and trade.ai_review_status in ${reviewedStatusSql}
      group by instrument.id
      order by netPnl desc, instrument.symbol asc`,
    )
    .all(...filters.params) as unknown as InstrumentAggregateRow[];
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
