import type { StatsEntryRuleOption, StatsOverviewFilters } from "./statsPanel";
import type { TagSummary } from "../../shared/contracts/desktopApi";
import { deriveTradeDateSemantics } from "../../shared/trading/tradeDates";

export function createPreviewTradeDetail(trade: TradeSummary): TradeDetail {
  return {
    ...trade,
    stopLossPrice: null,
    takeProfitPrice: null,
    backgroundNote: null,
    entryReason: null,
    exitReason: null,
    emotionNote: null,
    lessonNote: null,
    entryRuleContent: null,
    entryRuleChecklist: [],
    ruleChecks: [],
    executions: [
      {
        id: trade.id * 10 + 1,
        executedAt: trade.openedAt,
        side: trade.direction === "long" ? "buy" : "sell",
        price: trade.entryPriceAvg,
        quantity: trade.quantity,
        fee: 0,
        feeCurrency: "USD",
        executionType: "entry",
      },
      {
        id: trade.id * 10 + 2,
        executedAt: trade.closedAt,
        side: trade.direction === "long" ? "sell" : "buy",
        price: trade.exitPriceAvg,
        quantity: trade.quantity,
        fee: trade.feesTotal,
        feeCurrency: "USD",
        executionType: "exit",
      },
    ],
  };
}

export function formatStatsDrilldownLabel(
  filters: StatsOverviewFilters,
  entryRuleOptions: StatsEntryRuleOption[],
  tagOptions: TagSummary[] = [],
) {
  const parts = ["统计筛选"];

  if (filters.symbol) {
    parts.push(filters.symbol);
  }

  if (filters.entryRuleId != null) {
    const ruleLabel =
      entryRuleOptions.find((rule) => rule.id === filters.entryRuleId)?.label ??
      `规则 ${filters.entryRuleId}`;
    parts.push(ruleLabel);
  }

  if (filters.tagId != null) {
    const tagLabel =
      tagOptions.find((tag) => tag.id === filters.tagId)?.name ??
      `标签 ${filters.tagId}`;
    parts.push(tagLabel);
  }

  if (filters.openedFrom || filters.openedBefore) {
    const from = filters.openedFrom ? formatDateOnly(filters.openedFrom) : "最早";
    const before = filters.openedBefore
      ? formatDateOnly(filters.openedBefore)
      : "现在";
    parts.push(`${from} 至 ${before}`);
  }

  if (filters.dateFrom || filters.dateBefore) {
    const from = filters.dateFrom ?? "最早";
    const before = filters.dateBefore ?? "现在";
    const basis =
      filters.dateBasis === "market_session_day" ? "市场会话日" : "用户本地日";
    parts.push(`${basis} ${from} 至 ${before}`);
  }

  return parts.join(" / ");
}

export function updatePreviewTradeSummary(
  trades: TradeSummary[],
  id: number,
  input: CreateClosedTradeInput,
  calculation:
    | {
        grossPnl: number;
        netPnl: number;
        riskAmount: number | null;
        rMultiple: number | null;
      }
    | null,
): TradeSummary[] {
  return trades.map((trade) => {
    if (trade.id !== id) {
      return trade;
    }

    const dates = deriveTradeDateSemantics(input.openedAt);

    return {
      ...trade,
      symbol: input.symbol,
      direction: input.direction,
      openedAt: input.openedAt,
      userLocalDate: dates.userLocalDate,
      marketSessionDate: dates.marketSessionDate,
      closedAt: input.closedAt,
      entryPriceAvg: input.entryPrice,
      exitPriceAvg: input.exitPrice,
      quantity: input.quantity,
      feesTotal: input.feesTotal,
      grossPnl: calculation?.grossPnl ?? trade.grossPnl,
      netPnl: calculation?.netPnl ?? trade.netPnl,
      riskAmount: calculation?.riskAmount ?? trade.riskAmount,
      rMultiple: calculation?.rMultiple ?? trade.rMultiple,
    };
  });
}

export function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
