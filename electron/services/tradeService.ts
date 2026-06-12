import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { calculateClosedFuturesTrade } from "../../shared/trading/futuresMath.js";
import { deriveTradeDateSemantics } from "../../shared/trading/tradeDates.js";
import type {
  CreateClosedTradeInput,
  TradeDetail,
  TradeSummary,
} from "../../shared/contracts/desktopApi.js";
import {
  mapTradeDetailRow,
  mapTradeSummaryRow,
} from "./tradeMappers.js";
import {
  getTradeDetailRow,
  getTradeSummaryById,
  insertClosedTradeExecutions,
  insertClosedTradeRow,
  listAttachmentFileRows,
  listTradeExecutions,
  listTradeRuleChecks,
  listTradeSummaries,
  replaceClosedTradeRow,
  replaceTradeExecutions,
  type PersistClosedTradeRowInput,
} from "./tradeRepository.js";
import type { ClosedFuturesTradeCalculation } from "../../shared/trading/types.js";

export type {
  CreateClosedTradeInput,
  TradeDetail,
  TradeExecutionDetail,
  TradeRuleCheckDetail,
  TradeSummary,
} from "../../shared/contracts/desktopApi.js";

type InstrumentRow = {
  id: number;
  symbol: string;
  name: string;
  point_value: number;
  currency: string;
};

type EntryRuleVersionBinding = {
  entryRuleId: number;
  entryRuleVersionId: number;
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

  const entryRuleBinding = resolveEntryRuleBinding(
    db,
    input.entryRuleVersionId ?? null,
  );

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
    const tradeId = insertClosedTradeRow(
      db,
      createPersistClosedTradeRowInput(
        input,
        instrument.id,
        entryRuleBinding,
        calculation,
      ),
    );
    insertClosedTradeExecutions(db, {
      tradeId,
      direction: input.direction,
      openedAt: input.openedAt,
      closedAt: input.closedAt,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      quantity: input.quantity,
      feesTotal: input.feesTotal,
      currency: instrument.currency,
    });

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
  return listTradeSummaries(db).map(mapTradeSummaryRow);
}

export function getTradeDetail(
  db: DatabaseSync,
  id: number,
): TradeDetail | undefined {
  const trade = getTradeDetailRow(db, id);

  if (!trade) {
    return undefined;
  }

  const executions = listTradeExecutions(db, id);
  const ruleChecks = listTradeRuleChecks(db, id);

  return mapTradeDetailRow(trade, ruleChecks, executions);
}

export function deleteTrade(db: DatabaseSync, id: number): boolean {
  const attachmentRows = listAttachmentFileRows(db, id);
  const result = db.prepare("delete from trade where id = ?").run(id);

  if (result.changes > 0) {
    for (const attachment of attachmentRows) {
      if (fs.existsSync(attachment.filePath)) {
        fs.rmSync(attachment.filePath, { force: true });
      }
    }
  }

  return result.changes > 0;
}

export function updateClosedTrade(
  db: DatabaseSync,
  id: number,
  input: CreateClosedTradeInput,
): TradeSummary | undefined {
  validateClosedTradeInput(input);
  const existing = getTradeDetail(db, id);

  if (!existing) {
    return undefined;
  }

  const instrument = findInstrumentBySymbol(db, input.symbol);

  if (!instrument) {
    throw new Error(`Instrument ${input.symbol} is not configured.`);
  }

  const entryRuleBinding = resolveEntryRuleBinding(
    db,
    input.entryRuleVersionId ?? null,
  );

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
    replaceClosedTradeRow(
      db,
      id,
      createPersistClosedTradeRowInput(
        input,
        instrument.id,
        entryRuleBinding,
        calculation,
      ),
    );
    replaceTradeExecutions(db, {
      tradeId: id,
      direction: input.direction,
      openedAt: input.openedAt,
      closedAt: input.closedAt,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      quantity: input.quantity,
      feesTotal: input.feesTotal,
      currency: instrument.currency,
    });
    db.exec("commit");
    return getTradeById(db, id);
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function getTradeById(db: DatabaseSync, id: number): TradeSummary {
  const trade = getTradeSummaryById(db, id);

  if (!trade) {
    throw new Error(`Trade ${id} was not found after insert.`);
  }

  return mapTradeSummaryRow(trade);
}

function createPersistClosedTradeRowInput(
  input: CreateClosedTradeInput,
  instrumentId: number,
  entryRuleBinding: EntryRuleVersionBinding | undefined,
  calculation: ClosedFuturesTradeCalculation,
): PersistClosedTradeRowInput {
  const dates = deriveTradeDateSemantics(input.openedAt);

  return {
    instrumentId,
    entryRuleId: entryRuleBinding?.entryRuleId ?? null,
    entryRuleVersionId: entryRuleBinding?.entryRuleVersionId ?? null,
    direction: input.direction,
    openedAt: input.openedAt,
    userLocalDate: dates.userLocalDate,
    marketSessionDate: dates.marketSessionDate,
    closedAt: input.closedAt,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    quantity: input.quantity,
    stopLossPrice: input.stopLossPrice,
    takeProfitPrice: input.takeProfitPrice ?? null,
    feesTotal: input.feesTotal,
    grossPnl: calculation.grossPnl,
    netPnl: calculation.netPnl,
    riskAmount: calculation.riskAmount,
    rMultiple: calculation.rMultiple,
    backgroundNote: input.backgroundNote ?? null,
    entryReason: input.entryReason ?? null,
    exitReason: input.exitReason ?? null,
    emotionNote: input.emotionNote ?? null,
    lessonNote: input.lessonNote ?? null,
  };
}

function resolveEntryRuleBinding(
  db: DatabaseSync,
  entryRuleVersionId: number | null,
): EntryRuleVersionBinding | undefined {
  if (entryRuleVersionId == null) {
    return undefined;
  }

  const version = db
    .prepare(
      `select
        entry_rule_id as entryRuleId,
        id as entryRuleVersionId
      from entry_rule_version
      where id = ?`,
    )
    .get(entryRuleVersionId) as EntryRuleVersionBinding | undefined;

  if (!version) {
    throw new Error(`Entry rule version ${entryRuleVersionId} was not found.`);
  }

  return version;
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
