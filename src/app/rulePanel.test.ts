import { describe, expect, it } from "vitest";
import { buildRuleVersionLabel, parseChecklistText } from "./rulePanel";

describe("rule panel helpers", () => {
  it("builds readable rule version labels", () => {
    expect(
      buildRuleVersionLabel({
        id: 1,
        name: "Opening range pullback",
        description: null,
        marketType: "index_futures",
        status: "active",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
        latestVersion: {
          id: 3,
          entryRuleId: 1,
          versionNo: 2,
          content: "Version content",
          checklist: [],
          createdAt: "2026-06-10T00:00:00.000Z",
        },
      }),
    ).toBe("Opening range pullback / v2");
  });

  it("parses newline checklist text and removes blank lines", () => {
    expect(parseChecklistText(" Break confirmed\n\nRetest held \n")).toEqual([
      "Break confirmed",
      "Retest held",
    ]);
  });
});
