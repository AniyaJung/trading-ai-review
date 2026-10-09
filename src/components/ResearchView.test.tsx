import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { sampleTrades } from "../app/previewData";
import { createResearchFilters } from "../app/researchPanel";
import { ResearchView } from "./ResearchView";

const props = { isLoading: false, error: null, isPreview: false, filters: createResearchFilters(), groupBy: "marketRegime" as const,
  onFiltersChange: vi.fn(), onGroupByChange: vi.fn(), onRefresh: vi.fn(), onReset: vi.fn(), onOpenTrade: vi.fn() };

describe("research view", () => {
  it("exposes sample provenance, missing coverage and links back to individual trades", () => {
    const html = renderToStaticMarkup(<ResearchView {...props} samples={[{ trade: sampleTrades[0], record: { tradeId: 1, fields: { executionMode: "live", recordTiming: "post_trade", marketRegime: "range" }, createdAt: "", updatedAt: "" } }]} />);
    expect(html).toContain("事后回忆 / 补录");
    expect(html).toContain("MAE 点 / 覆盖");
    expect(html).toContain("选择偏差");
    expect(html).toContain("查看 1 笔");
    expect(html).not.toContain("NaN");
  });
  it("shows an actionable empty state and disables exporting an empty dataset", () => {
    const html = renderToStaticMarkup(<ResearchView {...props} samples={[]} />);
    expect(html).toContain("暂无匹配样本");
    expect(html).toContain("disabled");
  });
});
