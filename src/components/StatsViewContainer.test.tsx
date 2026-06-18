import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createStatsWorkflowInitialState,
} from "../app/statsWorkflow";
import { sampleTrades } from "../app/previewData";
import { StatsViewContainer } from "./StatsViewContainer";

function createWorkflow() {
  return {
    state: {
      ...createStatsWorkflowInitialState(),
      statsOverviewFilters: { dateBasis: "user_local_day" as const },
    },
    actions: {
      setIsLoadingStats: vi.fn(),
      setTradeDrilldownFilters: vi.fn(),
      refreshStats: vi.fn(),
      handleStatsFiltersChange: vi.fn(),
      applyBootstrapStats: vi.fn(),
      setStatsLoadFailure: vi.fn(),
    },
  };
}

describe("StatsViewContainer", () => {
  it("derives the preview panel and filter options from workflow inputs", () => {
    const html = renderToStaticMarkup(
      <StatsViewContainer
        runtime="browser-preview"
        workflow={createWorkflow()}
        trades={sampleTrades}
        instruments={[]}
        entryRules={[]}
        onDrillDown={vi.fn()}
      />,
    );

    expect(html).toContain("统计面板");
    expect(html).toContain("预览数据");
    expect(html).toContain('<option value="ES">ES</option>');
  });
});
