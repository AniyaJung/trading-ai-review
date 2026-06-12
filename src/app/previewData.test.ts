import { describe, expect, it } from "vitest";
import { sampleTrades } from "./previewData";

describe("previewData", () => {
  it("provides sample trades for browser preview states", () => {
    expect(sampleTrades).toHaveLength(3);
    expect(sampleTrades.map((trade) => trade.aiReviewStatus)).toEqual([
      "needs_review",
      "confirmed",
      "corrected",
    ]);
  });
});
