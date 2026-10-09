import { describe, expect, it } from "vitest";
import { normalizeResearchFields, researchDraftToFields, researchFieldsToDraft } from "./researchFields";

describe("research data boundaries", () => {
  it("keeps missing observations distinct from zero and explicit no", () => {
    expect(researchDraftToFields({ confidence: "", delta: "0", volume: "  ", stopMoved: "no", setup: " 回踩 " })).toEqual({ delta: 0, stopMoved: "no", setup: "回踩" });
    expect(researchFieldsToDraft({ delta: 0 })).toEqual({ delta: "0" });
  });
  it.each([
    { confidence: 0 }, { confidence: 6 }, { confidence: 2.5 }, { volume: -1 },
    { delta: NaN }, { delta: Infinity }, { maePoints: -1 }, { marketRegime: "anything" },
    { unsupported: "field" }, { thesis: "x".repeat(3001) },
  ])("rejects invalid data %j", (input) => {
    expect(() => normalizeResearchFields(input)).toThrow();
  });
  it("accepts signed price response, Delta and execution improvement", () => {
    expect(normalizeResearchFields({ delta: -1200, priceResponsePoints: -1.25, slippageTicks: -1 })).toEqual({ delta: -1200, priceResponsePoints: -1.25, slippageTicks: -1 });
    expect(() => researchDraftToFields({ delta: "bad number" })).toThrow();
  });
});
