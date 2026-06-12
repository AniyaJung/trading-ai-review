import { describe, expect, it } from "vitest";
import {
  createStatsWorkflowInitialState,
  getStatsRuntimePreviewState,
} from "./statsWorkflow";
import { getInitialStatsFilterState } from "./statsPanel";

describe("statsWorkflow", () => {
  it("creates initial stats workflow state", () => {
    const state = createStatsWorkflowInitialState();

    expect(state.statsOverview).toBeNull();
    expect(state.isLoadingStats).toBe(false);
    expect(state.statsError).toBeNull();
    expect(state.statsFilters).toEqual(getInitialStatsFilterState());
    expect(state.tradeDrilldownFilters).toBeNull();
  });

  it("builds runtime preview state from filters and overview", () => {
    expect(
      getStatsRuntimePreviewState("browser-preview", null, []),
    ).toEqual({
      isPreview: true,
      overview: expect.objectContaining({ totalTradeCount: 0 }),
    });
  });
});
