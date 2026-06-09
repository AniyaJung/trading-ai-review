import type { DatabaseSync } from "node:sqlite";

type TradeDirection = "long" | "short";

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

function calculateClosedFuturesTrade(input: {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  quantity: number;
  pointValue: number;
  feesTotal: number;
}) {
  const pointPnl =
    input.direction === "long"
      ? input.exitPrice - input.entryPrice
      : input.entryPrice - input.exitPrice;
  const grossPnl = pointPnl * input.pointValue * input.quantity;
  const netPnl = grossPnl - input.feesTotal;
  const riskAmount =
    Math.abs(input.entryPrice - input.stopLossPrice) *
    input.pointValue *
    input.quantity;

  return {
    grossPnl: roundForStorage(grossPnl),
    netPnl: roundForStorage(netPnl),
    riskAmount: roundForStorage(riskAmount),
    rMultiple: riskAmount > 0 ? roundForStorage(netPnl / riskAmount) : null,
  };
}

function roundForStorage(value: number) {
  return Number(value.toFixed(6));
}
