import type { DatabaseSync } from "node:sqlite";
import type {
  TradeDirection,
  TradeExecutionDetail,
  TradeRuleCheckDetail,
  TradeSummary,
} from "../../shared/contracts/desktopApi.js";
import type { TradeDetailRow } from "./tradeMappers.js";

export type AttachmentFileRow = {
  filePath: string;
};

export type PersistClosedTradeRowInput = {
  instrumentId: number;
  entryRuleId: number | null;
  entryRuleVersionId: number | null;
  direction: TradeDirection;
  openedAt: string;
  userLocalDate: string;
  marketSessionDate: string;
  closedAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLossPrice: number;
  takeProfitPrice: number | null;
  feesTotal: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rMultiple: number | null;
  backgroundNote: string | null;
  entryReason: string | null;
  exitReason: string | null;
  emotionNote: string | null;
  lessonNote: string | null;
};

export type PersistClosedTradeExecutionsInput = {
  tradeId: number;
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  feesTotal: number;
  currency: string;
};

export function insertClosedTradeRow(
  db: DatabaseSync,
  input: PersistClosedTradeRowInput,
): number {
  const result = db
    .prepare(
      `insert into trade (
        instrument_id,
        entry_rule_id,
        entry_rule_version_id,
        direction,
        status,
        opened_at,
        user_local_date,
        market_session_date,
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
      ) values (
        ?, ?, ?, ?,
        'closed',
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
    )
    .run(
      input.instrumentId,
      input.entryRuleId,
      input.entryRuleVersionId,
      input.direction,
      input.openedAt,
      input.userLocalDate,
      input.marketSessionDate,
      input.closedAt,
      input.entryPrice,
      input.exitPrice,
      input.quantity,
      input.stopLossPrice,
      input.takeProfitPrice,
      input.feesTotal,
      input.grossPnl,
      input.netPnl,
      input.riskAmount,
      input.rMultiple,
      input.backgroundNote,
      input.entryReason,
      input.exitReason,
      input.emotionNote,
      input.lessonNote,
    );

  return Number(result.lastInsertRowid);
}

export function replaceClosedTradeRow(
  db: DatabaseSync,
  tradeId: number,
  input: PersistClosedTradeRowInput,
) {
  db.prepare(
    `update trade set
      instrument_id = ?,
      entry_rule_id = ?,
      entry_rule_version_id = ?,
      direction = ?,
      opened_at = ?,
      user_local_date = ?,
      market_session_date = ?,
      closed_at = ?,
      entry_price_avg = ?,
      exit_price_avg = ?,
      quantity = ?,
      stop_loss_price = ?,
      take_profit_price = ?,
      fees_total = ?,
      gross_pnl = ?,
      net_pnl = ?,
      risk_amount = ?,
      r_multiple = ?,
      background_note = ?,
      entry_reason = ?,
      exit_reason = ?,
      emotion_note = ?,
      lesson_note = ?,
      updated_at = datetime('now')
    where id = ?`,
  ).run(
    input.instrumentId,
    input.entryRuleId,
    input.entryRuleVersionId,
    input.direction,
    input.openedAt,
    input.userLocalDate,
    input.marketSessionDate,
    input.closedAt,
    input.entryPrice,
    input.exitPrice,
    input.quantity,
    input.stopLossPrice,
    input.takeProfitPrice,
    input.feesTotal,
    input.grossPnl,
    input.netPnl,
    input.riskAmount,
    input.rMultiple,
    input.backgroundNote,
    input.entryReason,
    input.exitReason,
    input.emotionNote,
    input.lessonNote,
    tradeId,
  );
}

export function insertClosedTradeExecutions(
  db: DatabaseSync,
  input: PersistClosedTradeExecutionsInput,
) {
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
    input.tradeId,
    input.openedAt,
    entrySide,
    input.entryPrice,
    input.quantity,
    0,
    input.currency,
    "entry",
  );
  insertExecution.run(
    input.tradeId,
    input.closedAt,
    exitSide,
    input.exitPrice,
    input.quantity,
    input.feesTotal,
    input.currency,
    "exit",
  );
}

export function replaceTradeExecutions(
  db: DatabaseSync,
  input: PersistClosedTradeExecutionsInput,
) {
  db.prepare("delete from trade_execution where trade_id = ?").run(input.tradeId);
  insertClosedTradeExecutions(db, input);
}

export function listTradeSummaries(db: DatabaseSync): TradeSummary[] {
  const rows = db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.user_local_date as userLocalDate,
        trade.market_session_date as marketSessionDate,
        trade.closed_at as closedAt,
        trade.entry_price_avg as entryPriceAvg,
        trade.exit_price_avg as exitPriceAvg,
        trade.quantity,
        trade.fees_total as feesTotal,
        trade.gross_pnl as grossPnl,
        trade.net_pnl as netPnl,
        trade.risk_amount as riskAmount,
        trade.r_multiple as rMultiple,
        trade.entry_rule_id as entryRuleId,
        trade.entry_rule_version_id as entryRuleVersionId,
        entry_rule.name as entryRuleName,
        entry_rule_version.version_no as entryRuleVersionNo,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      left join entry_rule on entry_rule.id = trade.entry_rule_id
      left join entry_rule_version on entry_rule_version.id = trade.entry_rule_version_id
      order by trade.opened_at desc, trade.id desc`,
    )
    .all() as unknown as TradeSummary[];

  return attachTagIds(db, rows);
}

export function getTradeSummaryById(
  db: DatabaseSync,
  id: number,
): TradeSummary | undefined {
  const row = db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.user_local_date as userLocalDate,
        trade.market_session_date as marketSessionDate,
        trade.closed_at as closedAt,
        trade.entry_price_avg as entryPriceAvg,
        trade.exit_price_avg as exitPriceAvg,
        trade.quantity,
        trade.fees_total as feesTotal,
        trade.gross_pnl as grossPnl,
        trade.net_pnl as netPnl,
        trade.risk_amount as riskAmount,
        trade.r_multiple as rMultiple,
        trade.entry_rule_id as entryRuleId,
        trade.entry_rule_version_id as entryRuleVersionId,
        entry_rule.name as entryRuleName,
        entry_rule_version.version_no as entryRuleVersionNo,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      left join entry_rule on entry_rule.id = trade.entry_rule_id
      left join entry_rule_version on entry_rule_version.id = trade.entry_rule_version_id
      where trade.id = ?`,
    )
    .get(id) as TradeSummary | undefined;

  return row ? attachTagIds(db, [row])[0] : undefined;
}

export function getTradeDetailRow(
  db: DatabaseSync,
  id: number,
): TradeDetailRow | undefined {
  const row = db
    .prepare(
      `select
        trade.id,
        instrument.symbol,
        instrument.name as instrumentName,
        trade.direction,
        trade.status,
        trade.opened_at as openedAt,
        trade.user_local_date as userLocalDate,
        trade.market_session_date as marketSessionDate,
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
        trade.entry_rule_id as entryRuleId,
        trade.entry_rule_version_id as entryRuleVersionId,
        entry_rule.name as entryRuleName,
        entry_rule_version.version_no as entryRuleVersionNo,
        entry_rule_version.content as entryRuleContent,
        entry_rule_version.checklist_json as entryRuleChecklistJson,
        trade.background_note as backgroundNote,
        trade.entry_reason as entryReason,
        trade.exit_reason as exitReason,
        trade.emotion_note as emotionNote,
        trade.lesson_note as lessonNote,
        trade.ai_review_status as aiReviewStatus
      from trade
      join instrument on instrument.id = trade.instrument_id
      left join entry_rule on entry_rule.id = trade.entry_rule_id
      left join entry_rule_version on entry_rule_version.id = trade.entry_rule_version_id
      where trade.id = ?`,
    )
    .get(id) as TradeDetailRow | undefined;

  return row ? { ...row, tagIds: listTagIdsForTrade(db, id) } : undefined;
}

function attachTagIds<T extends TradeSummary>(
  db: DatabaseSync,
  trades: T[],
): T[] {
  if (trades.length === 0) {
    return trades;
  }

  const tagIdsByTradeId = listTagIdsByTradeId(
    db,
    trades.map((trade) => trade.id),
  );

  return trades.map((trade) => ({
    ...trade,
    tagIds: tagIdsByTradeId.get(trade.id) ?? [],
  }));
}

function listTagIdsByTradeId(db: DatabaseSync, tradeIds: number[]) {
  const placeholders = tradeIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `select trade_id as tradeId, tag_id as tagId
       from trade_tag_map
       where trade_id in (${placeholders})
       order by trade_id asc, tag_id asc`,
    )
    .all(...tradeIds) as Array<{ tradeId: number; tagId: number }>;
  const tagIdsByTradeId = new Map<number, number[]>();

  for (const row of rows) {
    tagIdsByTradeId.set(row.tradeId, [
      ...(tagIdsByTradeId.get(row.tradeId) ?? []),
      row.tagId,
    ]);
  }

  return tagIdsByTradeId;
}

function listTagIdsForTrade(db: DatabaseSync, tradeId: number) {
  return listTagIdsByTradeId(db, [tradeId]).get(tradeId) ?? [];
}

export function listTradeExecutions(
  db: DatabaseSync,
  tradeId: number,
): TradeExecutionDetail[] {
  return db
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
    .all(tradeId) as unknown as TradeExecutionDetail[];
}

export function listTradeRuleChecks(
  db: DatabaseSync,
  tradeId: number,
): TradeRuleCheckDetail[] {
  return db
    .prepare(
      `select
        id,
        entry_rule_version_id as entryRuleVersionId,
        check_item as checkItem,
        result,
        evidence,
        comment,
        score_delta as scoreDelta,
        created_at as createdAt
      from trade_rule_check
      where trade_id = ?
      order by id asc`,
    )
    .all(tradeId) as unknown as TradeRuleCheckDetail[];
}

export function listAttachmentFileRows(
  db: DatabaseSync,
  tradeId: number,
): AttachmentFileRow[] {
  return db
    .prepare("select file_path as filePath from trade_attachment where trade_id = ?")
    .all(tradeId) as unknown as AttachmentFileRow[];
}
