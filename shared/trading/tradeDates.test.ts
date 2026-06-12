import { describe, expect, it } from "vitest";
import { deriveTradeDateSemantics } from "./tradeDates";

describe("deriveTradeDateSemantics", () => {
  it("derives the user's local day from the configured user time zone", () => {
    expect(
      deriveTradeDateSemantics("2026-06-12T01:30:00.000Z", {
        userTimeZone: "Asia/Shanghai",
        marketTimeZone: "America/New_York",
      }),
    ).toEqual({
      userLocalDate: "2026-06-12",
      marketSessionDate: "2026-06-12",
    });
  });

  it("rolls CME-style market sessions to the next New York date at 18:00", () => {
    expect(
      deriveTradeDateSemantics("2026-06-11T20:30:00.000Z", {
        userTimeZone: "America/Los_Angeles",
        marketTimeZone: "America/New_York",
      }),
    ).toEqual({
      userLocalDate: "2026-06-11",
      marketSessionDate: "2026-06-11",
    });

    expect(
      deriveTradeDateSemantics("2026-06-11T22:30:00.000Z", {
        userTimeZone: "America/Los_Angeles",
        marketTimeZone: "America/New_York",
      }),
    ).toEqual({
      userLocalDate: "2026-06-11",
      marketSessionDate: "2026-06-12",
    });
  });
});
