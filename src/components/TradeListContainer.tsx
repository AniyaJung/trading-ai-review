import type { TradeWorkflow } from "../app/tradeWorkflow";
import { TradeListPanel } from "./TradeListPanel";

type TradeListWorkflow = {
  state: Pick<
    TradeWorkflow["state"],
    "isLoadingTrades" | "tradeLoadError" | "selectedTradeId"
  >;
};

type TradeListContainerProps = {
  workflow: TradeListWorkflow;
  trades: TradeSummary[];
  activeFilterLabel?: string | null;
  onClearFilter?: () => void;
  onSelectTrade: (tradeId: number) => void;
};

export function TradeListContainer({
  workflow,
  trades,
  activeFilterLabel,
  onClearFilter,
  onSelectTrade,
}: TradeListContainerProps) {
  const { isLoadingTrades, tradeLoadError, selectedTradeId } = workflow.state;
  const visibleSelectedTradeId = trades.some(
    (trade) => trade.id === selectedTradeId,
  )
    ? (selectedTradeId ?? undefined)
    : trades[0]?.id;

  return (
    <TradeListPanel
      trades={trades}
      selectedTradeId={visibleSelectedTradeId}
      isLoadingTrades={isLoadingTrades}
      tradeLoadError={tradeLoadError}
      activeFilterLabel={activeFilterLabel}
      onClearFilter={onClearFilter}
      onSelectTrade={onSelectTrade}
    />
  );
}
