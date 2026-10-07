import { describe, expect, it } from "vitest";
import { filterTradesByQuery, getInitialTrades } from "./tradeList";

describe("trade list helpers", () => {
  it("starts empty in Electron so real SQLite data is not masked by samples", () => {
    expect(getInitialTrades("electron", [{ id: 1 }])).toEqual([]);
  });

  it("uses sample trades in browser preview", () => {
    const samples = [{ id: 1 }];

    expect(getInitialTrades("browser-preview", samples)).toBe(samples);
  });

  it("searches by Chinese direction and review status labels", () => {
    const trades = [
      {
        id: 1,
        symbol: "ES",
        direction: "long" as const,
        openedAt: "2026-09-14T09:30:00.000Z",
        aiReviewStatus: "confirmed",
      },
      {
        id: 2,
        symbol: "NQ",
        direction: "short" as const,
        openedAt: "2026-09-14T10:30:00.000Z",
        aiReviewStatus: "draft",
      },
    ];

    expect(filterTradesByQuery(trades, "做空").map((trade) => trade.id)).toEqual([2]);
    expect(filterTradesByQuery(trades, "已确认").map((trade) => trade.id)).toEqual([1]);
    expect(filterTradesByQuery(trades, "")).toBe(trades);
  });
});
