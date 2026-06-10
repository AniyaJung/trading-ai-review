import type { DatabaseSync } from "node:sqlite";
import { calculateClosedFuturesTrade } from "../../shared/trading/futuresMath.js";
import type { TradeDirection } from "../../shared/trading/types.js";

export type CreateClosedTradeInput = {
  symbol: string;
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLossPrice: number;
  takeProfitPrice?: number | null;
  feesTotal: number;
  backgroundNote?: string | null;
  entryReason?: string | null;
  exitReason?: string | null;
  emotionNote?: string | null;
  lessonNote?: string | null;
};

export type TradeSummary = {
  id: number;
  symbol: string;
  instrumentName: string;
  direction: TradeDirection;
  status: "closed";
  openedAt: string;
  closedAt: string;
  entryPriceAvg: number;
  exitPriceAvg: number;
  quantity: number;
  feesTotal: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rMultiple: number | null;
  aiReviewStatus:
    | "not_generated"
    | "draft"
    | "needs_review"
    | "confirmed"
    | "corrected"
    | "invalid";
};

export type TradeExecutionDetail = {
  id: number;
  executedAt: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string | null;
  executionType: "entry" | "exit" | "add" | "reduce";
};

export type TradeDetail = TradeSummary & {
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  backgroundNote: string | null;
  entryReason: string | null;
  exitReason: string | null;
  emotionNote: string | null;
  lessonNote: string | null;
  executions: TradeExecutionDetail[];
};

type InstrumentRow = {
  id: number;
  symbol: string;
  name: string;
  point_value: number;
  currency: string;
};

export function createClosedTrade(
  db: DatabaseSync,
  input: CreateClosedTradeInput,
): TradeSummary {
  validateClosedTradeInput(input);
  const instrument = findInstrumentBySymbol(db, input.symbol);

  if (!instrument) {
    throw new Error(`Instrument ${input.symbol} is not configured.`);
  }

  const calculation = calculateClosedFuturesTrade({
    direction: input.direction,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    stopLossPrice: input.stopLossPrice,
    quantity: input.quantity,
    pointValue: instrument.point_value,
    feesTotal: input.feesTotal,
  });

  db.exec("begin immediate");
  try {
    const insertTradeResult = db
      .prepare(
        `insert into trade (
          instrument_id,
          direction,
          status,
          opened_at,
          closed_at,
          entry_price_avg,
          exit_price_avg,
          quantity,
          stop_loss_price,
          take_profit_price,
          fees_total,
          gross_pnl,
          net_pnl,
          risk_amount,
          r_multiple,
          background_note,
          entry_reason,
          exit_reason,
          emotion_note,
          lesson_note
        ) values (?, ?, 'closed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        instrument.id,
        input.direction,
        input.openedAt,
        input.closedAt,
        input.entryPrice,
        input.exitPrice,
        input.quantity,
        input.stopLossPrice,
        input.takeProfitPrice ?? null,
        input.feesTotal,
        calculation.grossPnl,
        calculation.netPnl,
        calculation.riskAmount,
        calculation.rMultiple,
        input.backgroundNote ?? null,
        input.entryReason ?? null,
        input.exitReason ?? null,
        input.emotionNote ?? null,
        input.lessonNote ?? null,
      );

    const tradeId = Number(insertTradeResult.lastInsertRowid);

    const entrySide = input.direction === "long" ? "buy" : "sell";
    const exitSide = input.direction === "long" ? "sell" : "buy";
    const insertExecution = db.prepare(
      `insert into trade_execution (
        trade_id,
        executed_at,
        side,
        price,
        quantity,
        fee,
        fee_currency,
        execution_type
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    insertExecution.run(
      tradeId,
      input.openedAt,
      entrySide,
      input.entryPrice,
      input.quantity,
      0,
      instrument.currency,
      "entry",
    );
    insertExecution.run(
      tradeId,
      input.closedAt,
      exitSide,
      input.exitPrice,
      input.quantity,
      input.feesTotal,
      instrument.currency,
      "exit",
    );

    db.exec("commit");
    return getTradeById(db, tradeId);
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function validateClosedTradeInput(input: CreateClosedTradeInput) {
  if (input.direction !== "long" && input.direction !== "short") {
    throw new Error("Direction must be long or short.");
  }

  assertPositiveFiniteNumber(input.entryPrice, "Entry price");
  assertPositiveFiniteNumber(input.exitPrice, "Exit price");
  assertPositiveFiniteNumber(input.stopLossPrice, "Stop loss price");
  assertFiniteNumber(input.feesTotal, "Fees total");

  if (input.takeProfitPrice != null) {
    assertPositiveFiniteNumber(input.takeProfitPrice, "Take profit price");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  if (input.feesTotal < 0) {
    throw new Error("Fees total cannot be negative.");
  }

  if (Number.isNaN(Date.parse(input.openedAt))) {
    throw new Error("Opened time must be a valid ISO timestamp.");
  }

  if (Number.isNaN(Date.parse(input.closedAt))) {
    throw new Error("Closed time must be a valid ISO timestamp.");
  }

  if (Date.parse(input.closedAt) < Date.parse(input.openedAt)) {
    throw new Error("Closed time must be after opened time.");
  }

  if (input.direction === "long" && input.stopLossPrice >= input.entryPrice) {
    throw new Error("Long trades require stop loss below entry price.");
  }

  if (input.direction === "short" && input.stopLossPrice <= input.entryPrice) {
    throw new Error("Short trades require stop loss above entry price.");
  }
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

function assertPositiveFiniteNumber(value: number, label: string) {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new Error(`${label} must be greater than 0.`);
  }
}

export function listTrades(db: DatabaseSync): TradeSummary[] {
  return db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.closed_at as closedAt,
        trade.entry_price_avg as entryPriceAvg,
        trade.exit_price_avg as exitPriceAvg,
        trade.quantity,
        trade.fees_total as feesTotal,
        trade.gross_pnl as grossPnl,
        trade.net_pnl as netPnl,
        trade.risk_amount as riskAmount,
        trade.r_multiple as rMultiple,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      order by trade.opened_at desc, trade.id desc`,
    )
    .all() as unknown as TradeSummary[];
}

export function getTradeDetail(
  db: DatabaseSync,
  id: number,
): TradeDetail | undefined {
  const trade = db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.closed_at as closedAt,
        trade.entry_price_avg as entryPriceAvg,
        trade.exit_price_avg as exitPriceAvg,
        trade.quantity,
        trade.stop_loss_price as stopLossPrice,
        trade.take_profit_price as takeProfitPrice,
        trade.fees_total as feesTotal,
        trade.gross_pnl as grossPnl,
        trade.net_pnl as netPnl,
        trade.risk_amount as riskAmount,
        trade.r_multiple as rMultiple,
        trade.background_note as backgroundNote,
        trade.entry_reason as entryReason,
        trade.exit_reason as exitReason,
        trade.emotion_note as emotionNote,
        trade.lesson_note as lessonNote,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      where trade.id = ?`,
    )
    .get(id) as Omit<TradeDetail, "executions"> | undefined;

  if (!trade) {
    return undefined;
  }

  const executions = db
    .prepare(
      `select
        id,
        executed_at as executedAt,
        side,
        price,
        quantity,
        fee,
        fee_currency as feeCurrency,
        execution_type as executionType
      from trade_execution
      where trade_id = ?
      order by executed_at asc, id asc`,
    )
    .all(id) as unknown as TradeExecutionDetail[];

  return { ...trade, executions };
}

export function deleteTrade(db: DatabaseSync, id: number): boolean {
  const result = db.prepare("delete from trade where id = ?").run(id);

  return result.changes > 0;
}

function getTradeById(db: DatabaseSync, id: number): TradeSummary {
  const trade = db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.closed_at as closedAt,
        trade.entry_price_avg as entryPriceAvg,
        trade.exit_price_avg as exitPriceAvg,
        trade.quantity,
        trade.fees_total as feesTotal,
        trade.gross_pnl as grossPnl,
        trade.net_pnl as netPnl,
        trade.risk_amount as riskAmount,
        trade.r_multiple as rMultiple,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      where trade.id = ?`,
    )
    .get(id) as TradeSummary | undefined;

  if (!trade) {
    throw new Error(`Trade ${id} was not found after insert.`);
  }

  return trade;
}

function findInstrumentBySymbol(
  db: DatabaseSync,
  symbol: string,
): InstrumentRow | undefined {
  return db
    .prepare(
      `select id, symbol, name, point_value, currency
       from instrument
       where symbol = ?`,
    )
    .get(symbol) as InstrumentRow | undefined;
}
