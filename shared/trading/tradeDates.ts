export type TradeDateSemantics = {
  userLocalDate: string;
  marketSessionDate: string;
};

export type TradeDateSemanticsOptions = {
  userTimeZone?: string;
  marketTimeZone?: string;
  marketSessionRolloverHour?: number;
};

const defaultMarketTimeZone = "America/New_York";
const defaultMarketSessionRolloverHour = 18;

export function deriveTradeDateSemantics(
  timestamp: string,
  options: TradeDateSemanticsOptions = {},
): TradeDateSemantics {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Trade timestamp must be a valid ISO timestamp.");
  }

  const userTimeZone = options.userTimeZone ?? getLocalTimeZone();
  const marketTimeZone = options.marketTimeZone ?? defaultMarketTimeZone;
  const marketSessionRolloverHour =
    options.marketSessionRolloverHour ?? defaultMarketSessionRolloverHour;
  const marketParts = getZonedDateParts(date, marketTimeZone);
  const marketDate = joinDateParts(marketParts);

  return {
    userLocalDate: formatDateInTimeZone(date, userTimeZone),
    marketSessionDate:
      marketParts.hour >= marketSessionRolloverHour
        ? addDaysToDateString(marketDate, 1)
        : marketDate,
  };
}

export function formatDateInTimeZone(
  value: Date,
  timeZone = getLocalTimeZone(),
) {
  return joinDateParts(getZonedDateParts(value, timeZone));
}

export function addDaysToDateString(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getZonedDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: Number(readPart(parts, "hour")),
  };
}

function readPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Could not format date part ${type}.`);
  }

  return value;
}

function joinDateParts(parts: { year: string; month: string; day: string }) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}
