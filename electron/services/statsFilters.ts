import type { StatsOverviewFilters } from "../../shared/contracts/desktopApi.js";

export type TradeFilterClause = {
  sql: string;
  params: Array<number | string>;
};

export function buildTradeFilterClause(
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
