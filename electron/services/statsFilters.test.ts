import { describe, expect, it } from "vitest";
import { buildTradeFilterClause } from "./statsFilters";

describe("buildTradeFilterClause", () => {
  it("builds market-session date filters when requested", () => {
    expect(
      buildTradeFilterClause({
        dateBasis: "market_session_day",
        dateFrom: "2026-06-01",
        dateBefore: "2026-07-01",
      }),
    ).toEqual({
      sql: [
        "trade.status = 'closed'",
        "trade.market_session_date >= ?",
        "trade.market_session_date < ?",
      ].join("\n        and "),
      params: ["2026-06-01", "2026-07-01"],
    });
  });

  it("can exclude tag filters for tag option aggregation", () => {
    expect(
      buildTradeFilterClause(
        {
          symbol: " ES ",
          entryRuleId: 7,
          tagId: 9,
        },
        { includeTagFilter: false },
      ),
    ).toEqual({
      sql: [
        "trade.status = 'closed'",
        "instrument.symbol = ?",
        "trade.entry_rule_id = ?",
      ].join("\n        and "),
      params: ["ES", 7],
    });
  });
});
