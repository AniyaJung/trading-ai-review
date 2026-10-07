import type { DatabaseSync } from "node:sqlite";
import type {
  SaveTradeJournalInput,
  TradeJournal,
} from "../../shared/contracts/desktopApi.js";

const maxTitleLength = 200;
const maxContentLength = 100_000;

export function getTradeJournal(
  db: DatabaseSync,
  tradeId: number,
): TradeJournal | undefined {
  return db
    .prepare(
      `select
        trade_id as tradeId,
        title,
        content,
        created_at as createdAt,
        updated_at as updatedAt
       from trade_journal
       where trade_id = ?`,
    )
    .get(tradeId) as TradeJournal | undefined;
}

export function saveTradeJournal(
  db: DatabaseSync,
  input: SaveTradeJournalInput,
): TradeJournal {
  assertTradeExists(db, input.tradeId);
  const title = normalizeText(input.title, maxTitleLength);
  const content = normalizeText(input.content, maxContentLength);

  db.prepare(
    `insert into trade_journal (trade_id, title, content)
     values (?, ?, ?)
     on conflict(trade_id) do update set
       title = excluded.title,
       content = excluded.content,
       updated_at = datetime('now')`,
  ).run(input.tradeId, title, content);

  return getTradeJournal(db, input.tradeId)!;
}

function assertTradeExists(db: DatabaseSync, tradeId: number) {
  const row = db.prepare("select id from trade where id = ?").get(tradeId);
  if (!row) {
    throw new Error(`Trade ${tradeId} was not found.`);
  }
}

function normalizeText(value: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new Error("Journal text must be a string.");
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (normalized.length > maxLength) {
    throw new Error(`Journal text cannot exceed ${maxLength} characters.`);
  }
  return normalized;
}
