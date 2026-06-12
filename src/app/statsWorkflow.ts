import { useCallback, useMemo, useState } from "react";
import {
  buildStatsOverviewFilters,
  getInitialStatsFilterState,
  getStatsPanelState,
  type StatsFilterState,
} from "./statsPanel";
import type { RendererRuntime } from "./tradeList";

export type StatsWorkflowState = {
  statsOverview: StatsOverview | null;
  isLoadingStats: boolean;
  statsError: string | null;
  statsFilters: StatsFilterState;
  tradeDrilldownFilters: StatsOverviewFilters | null;
};

export function createStatsWorkflowInitialState(): StatsWorkflowState {
  return {
    statsOverview: null,
    isLoadingStats: false,
    statsError: null,
    statsFilters: getInitialStatsFilterState(),
    tradeDrilldownFilters: null,
  };
}

export function getStatsRuntimePreviewState(
  runtime: RendererRuntime,
  overview: StatsOverview | null,
  trades: TradeSummary[],
  filters?: StatsOverviewFilters,
) {
  return getStatsPanelState({
    runtime,
    overview,
    trades,
    filters,
  });
}

export function useStatsWorkflow(
  desktopApi: DesktopApi | undefined,
) {
  const [statsOverview, setStatsOverview] = useState<StatsOverview | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsFilters, setStatsFilters] = useState<StatsFilterState>(() =>
    getInitialStatsFilterState(),
  );
  const [tradeDrilldownFilters, setTradeDrilldownFilters] =
    useState<StatsOverviewFilters | null>(null);

  const statsOverviewFilters = useMemo(
    () => buildStatsOverviewFilters(statsFilters),
    [statsFilters],
  );
  const refreshStats = useCallback(
    async (filters = statsOverviewFilters) => {
      if (!desktopApi) {
        return;
      }

      setIsLoadingStats(true);
      try {
        setStatsOverview(await desktopApi.stats.getOverview(filters));
        setStatsError(null);
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoadingStats(false);
      }
    },
    [desktopApi, statsOverviewFilters],
  );

  const handleStatsFiltersChange = (nextFilters: StatsFilterState) => {
    setStatsFilters(nextFilters);

    if (desktopApi) {
      void refreshStats(buildStatsOverviewFilters(nextFilters));
    }
  };

  const applyBootstrapStats = useCallback((overview: StatsOverview) => {
    setStatsOverview(overview);
    setStatsError(null);
  }, []);

  const setStatsLoadFailure = useCallback((message: string) => {
    setStatsError(message);
  }, []);

  return {
    state: {
      statsOverview,
      isLoadingStats,
      statsError,
      statsFilters,
      tradeDrilldownFilters,
      statsOverviewFilters,
    },
    actions: {
      setIsLoadingStats,
      setTradeDrilldownFilters,
      refreshStats,
      handleStatsFiltersChange,
      applyBootstrapStats,
      setStatsLoadFailure,
    },
  };
}
