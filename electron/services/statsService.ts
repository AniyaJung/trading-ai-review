import type { DatabaseSync } from "node:sqlite";
import type {
  InstrumentStats,
  StatsOverview,
  StatsOverviewFilters,
  TagSummary,
} from "../../shared/contracts/desktopApi.js";

export type {
  InstrumentStats,
  StatsOverview,
  StatsOverviewFilters,
  TagSummary,
} from "../../shared/contracts/desktopApi.js";

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

type TagAggregateRow = {
  id: number;
  name: string;
  category: TagSummary["category"];
  tradeCount: number;
};

const reviewedStatusSql = "('confirmed', 'corrected')";

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

type TradeFilterClause = {
  sql: string;
  params: Array<number | string>;
};

function buildTradeFilterClause(
  filters: StatsOverviewFilters,
  options: { includeTagFilter?: boolean } = {},
): TradeFilterClause {
  const clauses = ["trade.status = 'closed'"];
  const params: Array<number | string> = [];
  const includeTagFilter = options.includeTagFilter ?? true;
  const dateColumn =
    filters.dateBasis === "market_session_day"
      ? "trade.market_session_date"
      : "trade.user_local_date";

  if (filters.symbol?.trim()) {
    clauses.push("instrument.symbol = ?");
    params.push(filters.symbol.trim());
  }

  if (filters.entryRuleId != null) {
    clauses.push("trade.entry_rule_id = ?");
    params.push(filters.entryRuleId);
  }

  if (includeTagFilter && filters.tagId != null) {
    clauses.push(
      `exists (
        select 1
        from trade_tag_map
        where trade_tag_map.trade_id = trade.id
          and trade_tag_map.tag_id = ?
      )`,
    );
    params.push(filters.tagId);
  }

  if (filters.dateFrom?.trim()) {
    clauses.push(`${dateColumn} >= ?`);
    params.push(filters.dateFrom.trim());
  }

  if (filters.dateBefore?.trim()) {
    clauses.push(`${dateColumn} < ?`);
    params.push(filters.dateBefore.trim());
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

function getTagAggregates(
  db: DatabaseSync,
  filters: TradeFilterClause,
): TagSummary[] {
  return (
    db
      .prepare(
        `select
          tag.id,
          tag.name,
          tag.category,
          count(distinct trade.id) as tradeCount
        from trade
        join instrument on instrument.id = trade.instrument_id
        join trade_tag_map on trade_tag_map.trade_id = trade.id
        join tag on tag.id = trade_tag_map.tag_id
        where ${filters.sql}
          and trade.ai_review_status in ${reviewedStatusSql}
        group by tag.id
        order by tradeCount desc, tag.name asc`,
      )
      .all(...filters.params) as unknown as TagAggregateRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    tradeCount: row.tradeCount,
  }));
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
