import { describe, expect, it } from "vitest";
import type { TradeResearchFields, TradeResearchSample } from "../../shared/contracts/researchContracts";
import { sampleTrades } from "./previewData";
import { createResearchFilters, exportResearchCsv, filterResearchSamples, getResearchFilterError, groupResearchSamples } from "./researchPanel";

function sample(id: number, fields: TradeResearchFields, overrides: Partial<TradeSummary> = {}): TradeResearchSample {
  return { trade: { ...sampleTrades[0], id, symbol: "ES", marketSessionDate: "2026-10-08", netPnl: 100, rMultiple: 1, ...overrides },
    record: { tradeId: id, fields, createdAt: "2026-10-08T00:00:00Z", updatedAt: "2026-10-08T00:00:00Z" } };
}
const common: TradeResearchFields = { executionMode: "live", recordTiming: "post_trade", studyPhase: "discovery", marketRegime: "range" };

describe("subjective research statistics", () => {
  it("uses trade facts without requiring AI confirmation and reports missing coverage", () => {
    const samples = [sample(1, { ...common, maePoints: 0, mfePoints: 2 }), sample(2, common, { netPnl: -100, rMultiple: -1 }), sample(3, common, { netPnl: 0, rMultiple: null })];
    const selected = filterResearchSamples(samples, createResearchFilters());
    const [group] = groupResearchSamples(selected, "marketRegime");
    expect(group).toMatchObject({ sampleCount: 3, rCount: 2, meanR: 0, winRate: 1 / 3, totalNetPnl: 0, meanMae: 0, maeCount: 1, meanMfe: 2, mfeCount: 1 });
  });
  it("partitions symbols, modes, timing and validation phases", () => {
    const groups = groupResearchSamples([
      sample(1, common), sample(2, common, { symbol: "NQ" }),
      sample(3, { ...common, executionMode: "replay" }), sample(4, { ...common, recordTiming: "pre_entry" }),
      sample(5, { ...common, studyPhase: "validation" }), sample(6, { ...common, executionMode: undefined }),
    ], "marketRegime");
    expect(groups).toHaveLength(6);
    expect(groups.every((group) => group.sampleCount === 1)).toBe(true);
  });
  it("excludes missing numeric observations and respects Delta convention and window", () => {
    const samples = [sample(1, { ...common, delta: 3000, deltaConvention: "ask_minus_bid", measurementWindow: "30s", vwapDistancePoints: -2 }),
      sample(2, { ...common, delta: 4000, deltaConvention: "bid_minus_ask", measurementWindow: "30s", vwapDistancePoints: 1 }),
      sample(3, common)];
    const filters = { ...createResearchFilters(), deltaMin: "2500", maxVwapDistance: "5", deltaConvention: "ask_minus_bid", measurementWindow: "30s" };
    expect(filterResearchSamples(samples, filters).map(({ trade }) => trade.id)).toEqual([1]);
    expect(getResearchFilterError({ ...filters, deltaConvention: "" })).toBeTruthy();
    expect(getResearchFilterError({ ...filters, deltaMax: "2000" })).toBeTruthy();
  });
  it("filters dates by market session day and excludes unrecorded trades", () => {
    const samples = [sample(1, common), { trade: sampleTrades[1], record: undefined }];
    expect(filterResearchSamples(samples, { ...createResearchFilters(), startDate: "2026-10-09" })).toEqual([]);
    expect(filterResearchSamples(samples, createResearchFilters())).toHaveLength(1);
    expect(getResearchFilterError({ ...createResearchFilters(), startDate: "2026-10-10", endDate: "2026-10-08" })).toBeTruthy();
  });
  it("exports selected raw observations with missing cells and spreadsheet-safe text", () => {
    const csv = exportResearchCsv([sample(1, { ...common, setup: '=HYPERLINK("test")', delta: -3 })]);
    expect(csv).toContain('"net_r"');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"-3"');
    expect(csv).not.toContain("undefined");
  });
});
