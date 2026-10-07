export type RendererRuntime = "electron" | "browser-preview";

export function getInitialTrades<T>(
  runtime: RendererRuntime,
  sampleTrades: T[],
): T[] {
  return runtime === "electron" ? [] : sampleTrades;
}

type SearchableTrade = {
  symbol: string;
  direction: TradeDirection;
  openedAt: string;
  aiReviewStatus: string;
};

const searchStatusLabels: Record<string, string> = {
  not_generated: "未生成",
  draft: "待确认",
  needs_review: "待确认",
  confirmed: "已确认",
  corrected: "已修正",
  invalid: "已作废",
};

const searchDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Filters the visible list without changing the active stats drill-down.
 * Search terms are matched against the values users commonly see in a row,
 * including Chinese direction/status labels and the ISO date representation.
 */
export function filterTradesByQuery<T extends SearchableTrade>(
  trades: T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return trades;
  }

  return trades.filter((trade) => {
    const date = new Date(trade.openedAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? trade.openedAt
      : searchDateFormatter.format(date);
    const searchableText = [
      trade.symbol,
      trade.direction,
      trade.direction === "long" ? "做多" : "做空",
      trade.aiReviewStatus,
      searchStatusLabels[trade.aiReviewStatus] ?? trade.aiReviewStatus,
      trade.openedAt,
      dateLabel,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
