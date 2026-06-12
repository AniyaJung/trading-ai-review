import type {
  TradeDetail,
  TradeExecutionDetail,
  TradeRuleCheckDetail,
  TradeSummary,
} from "../../shared/contracts/desktopApi.js";

export type TradeDetailRow = Omit<
  TradeDetail,
  "entryRuleChecklist" | "executions" | "ruleChecks"
> & {
  entryRuleChecklistJson: string | null;
};

export function mapTradeSummaryRow(row: TradeSummary): TradeSummary {
  return row;
}

export function mapTradeDetailRow(
  row: TradeDetailRow,
  ruleChecks: TradeRuleCheckDetail[],
  executions: TradeExecutionDetail[],
): TradeDetail {
  const { entryRuleChecklistJson, ...tradeDetail } = row;

  return {
    ...tradeDetail,
    entryRuleChecklist: entryRuleChecklistJson
      ? (JSON.parse(entryRuleChecklistJson) as string[])
      : [],
    ruleChecks,
    executions,
  };
}
