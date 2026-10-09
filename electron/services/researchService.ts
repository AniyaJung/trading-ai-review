import type { DatabaseSync } from "node:sqlite";
import type {
  SaveTradeResearchInput,
  TradeResearchRecord,
  TradeResearchSample,
} from "../../shared/contracts/researchContracts.js";
import { normalizeResearchFields } from "../../shared/trading/researchFields.js";
import { listTrades } from "./tradeService.js";

type ResearchRow = { tradeId: number; fieldsJson: string; createdAt: string; updatedAt: string };
const selectRecord = `select trade_id as tradeId, fields_json as fieldsJson,
  created_at as createdAt, updated_at as updatedAt from trade_research`;

function validateTradeId(tradeId: unknown): asserts tradeId is number {
  if (typeof tradeId !== "number" || !Number.isSafeInteger(tradeId) || tradeId < 1) {
    throw new Error("交易编号无效。");
  }
}

function mapRecord(row: ResearchRow): TradeResearchRecord {
  return {
    tradeId: row.tradeId,
    fields: normalizeResearchFields(JSON.parse(row.fieldsJson)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getTradeResearch(db: DatabaseSync, tradeId: number) {
  validateTradeId(tradeId);
  const row = db.prepare(`${selectRecord} where trade_id = ?`).get(tradeId) as ResearchRow | undefined;
  return row ? mapRecord(row) : undefined;
}

export function saveTradeResearch(db: DatabaseSync, input: SaveTradeResearchInput): TradeResearchRecord {
  if (!input || typeof input !== "object") throw new Error("研究记录输入无效。");
  validateTradeId(input.tradeId);
  const fields = normalizeResearchFields(input.fields);
  if (!db.prepare("select id from trade where id = ?").get(input.tradeId)) {
    throw new Error("交易不存在，无法保存研究记录。");
  }
  const now = new Date().toISOString();
  db.prepare(`insert into trade_research (trade_id, fields_json, created_at, updated_at)
    values (?, ?, ?, ?)
    on conflict(trade_id) do update set fields_json = excluded.fields_json,
      updated_at = excluded.updated_at`).run(input.tradeId, JSON.stringify(fields), now, now);
  return getTradeResearch(db, input.tradeId)!;
}

export function listResearchSamples(db: DatabaseSync): TradeResearchSample[] {
  const records = new Map((db.prepare(selectRecord).all() as ResearchRow[])
    .map((row) => [row.tradeId, mapRecord(row)]));
  // Trade facts remain available even without an AI review or a research record.
  return listTrades(db).map((trade) => ({ trade, record: records.get(trade.id) }));
}
