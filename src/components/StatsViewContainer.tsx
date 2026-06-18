import { useMemo } from "react";
import {
  createStatsEntryRuleOptions,
} from "../app/statsPanel";
import {
  getStatsRuntimePreviewState,
  type StatsWorkflow,
} from "../app/statsWorkflow";
import type { RendererRuntime } from "../app/tradeList";
import { StatsView } from "./StatsView";

type StatsViewContainerProps = {
  runtime: RendererRuntime;
  workflow: StatsWorkflow;
  trades: TradeSummary[];
  instruments: InstrumentConfig[];
  entryRules: EntryRuleWithLatestVersion[];
  onDrillDown: (filters: StatsOverviewFilters) => void;
};

export function StatsViewContainer({
  runtime,
  workflow,
  trades,
  instruments,
  entryRules,
  onDrillDown,
}: StatsViewContainerProps) {
  const {
    statsOverview,
    isLoadingStats,
    statsError,
    statsFilters,
    statsOverviewFilters,
  } = workflow.state;
  const { refreshStats, handleStatsFiltersChange } = workflow.actions;
  const panel = getStatsRuntimePreviewState(
    runtime,
    statsOverview,
    trades,
    statsOverviewFilters,
  );
  const instrumentOptions = useMemo(() => {
    if (instruments.length > 0) {
      return instruments;
    }

    const previewInstruments = new Map<string, InstrumentConfig>();
    for (const trade of trades) {
      previewInstruments.set(trade.symbol, {
        symbol: trade.symbol,
        name: trade.instrumentName,
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 0,
        pointValue: 0,
      });
    }
    return [...previewInstruments.values()];
  }, [instruments, trades]);
  const entryRuleOptions = useMemo(
    () => createStatsEntryRuleOptions(entryRules, trades),
    [entryRules, trades],
  );

  return (
    <StatsView
      overview={panel.overview}
      isLoading={isLoadingStats}
      error={statsError}
      isPreview={panel.isPreview}
      filters={statsFilters}
      instruments={instrumentOptions}
      entryRuleOptions={entryRuleOptions}
      onFiltersChange={handleStatsFiltersChange}
      onDrillDown={onDrillDown}
      onRefresh={() => void refreshStats()}
    />
  );
}
