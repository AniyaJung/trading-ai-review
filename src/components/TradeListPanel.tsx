import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";

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
  return (
    <section className="panel trade-list-panel" aria-label="交易列表">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Recent closed trades</p>
          <h3>交易列表</h3>
        </div>
        <span className="count-pill">{trades.length}</span>
      </div>

      {activeFilterLabel ? (
        <div className="trade-list-filter-banner">
          <span>{activeFilterLabel}</span>
          <button
            type="button"
            className="icon-button"
            title="清除统计下钻筛选"
            onClick={onClearFilter}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}

      <div className="trade-table">
        {isLoadingTrades ? (
          <div className="table-state">正在读取本地交易记录...</div>
        ) : tradeLoadError ? (
          <div className="table-state error">读取交易失败：{tradeLoadError}</div>
        ) : trades.length === 0 ? (
          <div className="table-state">
            暂无交易。保存右侧表单后，这里会显示真实记录。
          </div>
        ) : (
          trades.map((trade) => (
            <button
              key={trade.id}
              type="button"
              className={trade.id === selectedTradeId ? "trade-row selected" : "trade-row"}
              onClick={() => onSelectTrade(trade.id)}
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
