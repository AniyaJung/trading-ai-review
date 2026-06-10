import type { ClosedFuturesTradeCalculation } from "../../shared/trading/types";
import { calculateClosedFuturesTrade } from "../../shared/trading/futuresMath";

export type TradeFormState = {
  symbol: "ES" | "MES" | "NQ" | "MNQ";
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  feesTotal: string;
  entryReason: string;
  exitReason: string;
};

type TradeFormBuildResult =
  | { ok: true; input: CreateClosedTradeInput }
  | { ok: false; errors: string[] };

const pointValueBySymbol: Record<TradeFormState["symbol"], number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
};

export function createInitialTradeForm(now = new Date()): TradeFormState {
  return {
    symbol: "ES",
    direction: "long",
    openedAt: formatLocalDateTimeInput(now),
    closedAt: formatLocalDateTimeInput(addMinutes(now, 30)),
    entryPrice: "",
    exitPrice: "",
    quantity: "1",
    stopLossPrice: "",
    takeProfitPrice: "",
    feesTotal: "0",
    entryReason: "",
    exitReason: "",
  };
}

export function createTradeFormAfterSave(
  previous: TradeFormState,
  now = new Date(),
): TradeFormState {
  return {
    ...createInitialTradeForm(now),
    symbol: previous.symbol,
    direction: previous.direction,
    quantity: previous.quantity,
    feesTotal: previous.feesTotal,
  };
}

export function calculateTradeFormPreview(
  form: TradeFormState,
): ClosedFuturesTradeCalculation | null {
  const entryPrice = Number(form.entryPrice);
  const exitPrice = Number(form.exitPrice);
  const stopLossPrice = Number(form.stopLossPrice);
  const quantity = Number(form.quantity);
  const feesTotal = Number(form.feesTotal);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice) ||
    !Number.isFinite(stopLossPrice) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(feesTotal)
  ) {
    return null;
  }

  try {
    return calculateClosedFuturesTrade({
      direction: form.direction,
      entryPrice,
      exitPrice,
      stopLossPrice,
      quantity,
      pointValue: pointValueBySymbol[form.symbol],
      feesTotal,
    });
  } catch {
    return null;
  }
}

export function buildCreateClosedTradeInput(
  form: TradeFormState,
): TradeFormBuildResult {
  const errors: string[] = [];
  const openedAt = parseRequiredLocalDateTime(form.openedAt, "开仓时间", errors);
  const closedAt = parseRequiredLocalDateTime(form.closedAt, "平仓时间", errors);
  const entryPrice = parsePositiveNumber(form.entryPrice, "入场点位", errors);
  const exitPrice = parsePositiveNumber(form.exitPrice, "出场点位", errors);
  const stopLossPrice = parsePositiveNumber(
    form.stopLossPrice,
    "止损点位",
    errors,
  );
  const takeProfitPrice = parseOptionalPositiveNumber(
    form.takeProfitPrice,
    "止盈点位",
    errors,
  );
  const quantity = parsePositiveInteger(form.quantity, "合约数", errors);
  const feesTotal = parseNonNegativeNumber(form.feesTotal, "手续费", errors);

  if (openedAt && closedAt && Date.parse(closedAt) < Date.parse(openedAt)) {
    errors.push("平仓时间不能早于开仓时间。");
  }

  if (entryPrice != null && stopLossPrice != null) {
    if (form.direction === "long" && stopLossPrice >= entryPrice) {
      errors.push("做多交易的止损点位必须低于入场点位。");
    }

    if (form.direction === "short" && stopLossPrice <= entryPrice) {
      errors.push("做空交易的止损点位必须高于入场点位。");
    }
  }

  if (
    errors.length > 0 ||
    !openedAt ||
    !closedAt ||
    entryPrice == null ||
    exitPrice == null ||
    stopLossPrice == null ||
    quantity == null ||
    feesTotal == null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      symbol: form.symbol,
      direction: form.direction,
      openedAt,
      closedAt,
      entryPrice,
      exitPrice,
      quantity,
      stopLossPrice,
      takeProfitPrice,
      feesTotal,
      entryReason: form.entryReason,
      exitReason: form.exitReason,
    },
  };
}

export function parseLocalDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Invalid datetime-local value.");
  }

  const [, year, month, day, hour, minute] = match;
  const expected = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
  const date = new Date(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== expected.year ||
    date.getMonth() !== expected.month - 1 ||
    date.getDate() !== expected.day ||
    date.getHours() !== expected.hour ||
    date.getMinutes() !== expected.minute
  ) {
    throw new Error("Invalid datetime-local value.");
  }

  return date.toISOString();
}

function formatLocalDateTimeInput(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseRequiredLocalDateTime(
  value: string,
  label: string,
  errors: string[],
): string | null {
  if (value.trim() === "") {
    errors.push(`请填写${label}。`);
    return null;
  }

  try {
    return parseLocalDateTimeToIso(value);
  } catch {
    errors.push(`${label}格式无效。`);
    return null;
  }
}

function parsePositiveNumber(
  value: string,
  label: string,
  errors: string[],
): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${label}必须大于 0。`);
    return null;
  }

  return parsed;
}

function parseOptionalPositiveNumber(
  value: string,
  label: string,
  errors: string[],
): number | null {
  if (value.trim() === "") {
    return null;
  }

  return parsePositiveNumber(value, label, errors);
}

function parsePositiveInteger(
  value: string,
  label: string,
  errors: string[],
): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${label}必须是正整数。`);
    return null;
  }

  return parsed;
}

function parseNonNegativeNumber(
  value: string,
  label: string,
  errors: string[],
): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${label}必须是有效数字。`);
    return null;
  }

  if (parsed < 0) {
    errors.push(`${label}不能为负数。`);
    return null;
  }

  return parsed;
}
