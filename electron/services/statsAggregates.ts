import type { DatabaseSync } from "node:sqlite";
import type { TagSummary } from "../../shared/contracts/desktopApi.js";
import type { TradeFilterClause } from "./statsFilters.js";

export type AggregateRow = {
  tradeCount: number;
  netPnl: number | null;
  winningTradeCount: number;
  rMultipleCount: number;
  rMultipleTotal: number | null;
  grossProfit: number | null;
  grossLoss: number | null;
  feesTotal: number | null;
};

export type InstrumentAggregateRow = AggregateRow & {
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

export function getTradeCount(db: DatabaseSync, filters: TradeFilterClause) {
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

export function getReviewedAggregate(
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

export function getInstrumentAggregates(
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

export function getTagAggregates(
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
