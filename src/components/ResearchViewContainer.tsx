import { useCallback, useEffect, useRef, useState } from "react";
import type { DesktopApi } from "../../shared/contracts/desktopApi";
import type { TradeResearchSample } from "../../shared/contracts/researchContracts";
import { createResearchFilters, type ResearchFilters, type ResearchGroupBy } from "../app/researchPanel";
import type { TradeResearchWorkflow } from "../app/tradeResearchWorkflow";
import { ResearchView } from "./ResearchView";

type Props = {
  desktopApi: DesktopApi | undefined;
  trades: TradeSummary[];
  workflow: TradeResearchWorkflow;
  filters: ResearchFilters;
  groupBy: ResearchGroupBy;
  onFiltersChange: (filters: ResearchFilters) => void;
  onGroupByChange: (groupBy: ResearchGroupBy) => void;
  onOpenTrade: (tradeId: number) => void;
};

export function ResearchViewContainer({ desktopApi, trades, workflow, filters, groupBy, onFiltersChange, onGroupByChange, onOpenTrade }: Props) {
  const [samples, setSamples] = useState<TradeResearchSample[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(desktopApi));
  const [error, setError] = useState<string | null>(null);
  const loadToken = useRef(0);
  const loadSamples = useCallback(() => {
    if (!desktopApi) return;
    const token = ++loadToken.current;
    return desktopApi.research.listSamples().then((loaded) => {
      if (token === loadToken.current) {
        setSamples(loaded);
        setError(null);
      }
    }).catch((loadError: unknown) => {
      if (token === loadToken.current) {
        setSamples([]);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    }).finally(() => {
      if (token === loadToken.current) setIsLoading(false);
    });
  }, [desktopApi]);
  useEffect(() => { void loadSamples(); return () => { loadToken.current += 1; }; }, [loadSamples]);
  const refresh = () => {
    setIsLoading(Boolean(desktopApi));
    setError(null);
    void loadSamples();
  };
  const visibleSamples = desktopApi ? samples : trades.map((trade) => ({ trade, record: workflow.entries[trade.id]?.record }));
  return <ResearchView samples={visibleSamples} isLoading={isLoading} error={error} isPreview={!desktopApi} filters={filters} groupBy={groupBy}
    onFiltersChange={onFiltersChange} onGroupByChange={onGroupByChange} onRefresh={refresh}
    onReset={() => onFiltersChange(createResearchFilters())} onOpenTrade={onOpenTrade} />;
}
