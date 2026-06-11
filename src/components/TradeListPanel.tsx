import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type TradeListPanelProps = {
  trades: TradeSummary[];
  selectedTradeId: number | undefined;
  isLoadingTrades: boolean;
  tradeLoadError: string | null;
  onSelectTrade: (tradeId: number) => void;
};

export function TradeListPanel({
  trades,
  selectedTradeId,
  isLoadingTrades,
  tradeLoadError,
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
                {trade.direction}
              </span>
              <span>{trade.quantity}</span>
              <span>{trade.entryPriceAvg}</span>
              <span>{trade.exitPriceAvg}</span>
              <span className={`status ${trade.aiReviewStatus}`}>
                {trade.aiReviewStatus}
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
