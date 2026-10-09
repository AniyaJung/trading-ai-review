import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, X } from "lucide-react";
import { filterTradesByQuery } from "../app/tradeList";

type TradeListPanelProps = {
  trades: TradeSummary[];
  selectedTradeId: number | undefined;
  isLoadingTrades: boolean;
  tradeLoadError: string | null;
  activeFilterLabel?: string | null;
  onClearFilter?: () => void;
  onSelectTrade: (tradeId: number) => void;
};

export function TradeListPanel({
  trades,
  selectedTradeId,
  isLoadingTrades,
  tradeLoadError,
  activeFilterLabel,
  onClearFilter,
  onSelectTrade,
}: TradeListPanelProps) {
  const [query, setQuery] = useState("");
  const filteredTrades = useMemo(
    () => filterTradesByQuery(trades, query),
    [trades, query],
  );

  return (
    <section className="panel trade-list-panel" aria-label="交易列表">
      <div className="panel-heading">
        <div>
          <h3>交易列表</h3>
          <p className="panel-caption">选择一笔交易开始复盘</p>
        </div>
        <span className="count-pill">
          {query.trim() ? `${filteredTrades.length}/${trades.length}` : trades.length}
        </span>
      </div>

      <div className="trade-search-field">
        <Search aria-hidden="true" size={16} />
        <label className="sr-only" htmlFor="trade-list-search">
          搜索交易
        </label>
        <input
          id="trade-list-search"
          type="search"
          value={query}
          placeholder="搜索品种、方向、状态或日期"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {query ? (
          <button
            type="button"
            className="icon-button"
            title="清除搜索"
            aria-label="清除搜索"
            onClick={() => setQuery("")}
          >
            <X aria-hidden="true" size={15} />
          </button>
        ) : null}
      </div>

      {activeFilterLabel ? (
        <div className="trade-list-filter-banner">
          <span>{activeFilterLabel}</span>
          <button
            type="button"
            className="icon-button"
            title="清除统计筛选"
            onClick={onClearFilter}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}

      {query.trim() && selectedTradeId != null && !filteredTrades.some((trade) => trade.id === selectedTradeId) ? (
        <div className="trade-list-filter-banner">当前详情不在搜索结果中，点击结果行切换交易。</div>
      ) : null}

      <div className="trade-table">
        {isLoadingTrades ? (
          <div className="table-state">正在读取本机交易记录...</div>
        ) : tradeLoadError ? (
          <div className="table-state error">
            交易记录读取失败：{tradeLoadError}
          </div>
        ) : trades.length === 0 ? (
          <div className="table-state">
            还没有交易记录。填写交易事实并保存后，这里会显示你的复盘列表。
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="table-state">
            没有找到匹配的交易。可以尝试输入品种、做多/做空或复盘状态。
          </div>
        ) : (
          filteredTrades.map((trade) => (
            <button
              key={trade.id}
              type="button"
              className={
                trade.id === selectedTradeId
                  ? "trade-row selected"
                  : "trade-row"
              }
              onClick={() => onSelectTrade(trade.id)}
              aria-pressed={trade.id === selectedTradeId}
            >
              <span className="trade-main">
                <strong>{trade.symbol}</strong>
                <small>{formatTradeTime(trade.openedAt)}</small>
              </span>
              <span className="direction">
                {trade.direction === "long" ? (
                  <ArrowUpRight aria-hidden="true" size={16} />
                ) : (
                  <ArrowDownRight aria-hidden="true" size={16} />
                )}
                {formatDirection(trade.direction)}
              </span>
              <span className={trade.netPnl >= 0 ? "pnl positive" : "pnl negative"}>
                {formatCurrency(trade.netPnl)}
              </span>
              <span className="trade-r">{formatRMultiple(trade.rMultiple)}</span>
              <span className="quantity">{trade.quantity} 手</span>
              <span className={`status ${trade.aiReviewStatus}`}>
                {formatReviewStatus(trade.aiReviewStatus)}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDirection(direction: TradeDirection) {
  return direction === "long" ? "做多" : "做空";
}

function formatCurrency(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatRMultiple(value: number | null) {
  return value == null ? "-R" : `${value.toFixed(2)}R`;
}

function formatReviewStatus(status: TradeSummary["aiReviewStatus"]) {
  switch (status) {
    case "not_generated":
      return "未生成";
    case "draft":
    case "needs_review":
      return "待确认";
    case "confirmed":
      return "已确认";
    case "corrected":
      return "已修正";
    case "invalid":
      return "已作废";
  }
}
