import { describe, expect, it } from "vitest";
import { getInitialTrades } from "./tradeList";

describe("trade list helpers", () => {
  it("starts empty in Electron so real SQLite data is not masked by samples", () => {
    expect(getInitialTrades("electron", [{ id: 1 }])).toEqual([]);
  });

  it("uses sample trades in browser preview", () => {
    const samples = [{ id: 1 }];

    expect(getInitialTrades("browser-preview", samples)).toBe(samples);
  });
});
