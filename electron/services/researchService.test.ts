import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "../data/database";
import { createResearchIpcHandlers } from "../ipc/researchIpc";
import { getTradeResearch, listResearchSamples, saveTradeResearch } from "./researchService";
import { saveTradeJournal, getTradeJournal } from "./tradeJournalService";
import { createClosedTrade } from "./tradeService";

const databases: DatabaseSync[] = [];
function database() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec("pragma foreign_keys = ON");
  runMigrations(db);
  const trade = createClosedTrade(db, { symbol: "ES", direction: "long", openedAt: "2026-10-07T14:30:00Z", closedAt: "2026-10-07T14:35:00Z", entryPrice: 5300, exitPrice: 5304, stopLossPrice: 5298, quantity: 1, feesTotal: 2 });
  return { db, trade };
}
afterEach(() => { databases.splice(0).forEach((db) => db.close()); });

describe("persistent trade research", () => {
  it("upserts one record without changing AI status or human journals", () => {
    const { db, trade } = database();
    const handlers = createResearchIpcHandlers(db);
    saveTradeJournal(db, { tradeId: trade.id, title: "journal", content: "independent" });
    expect(handlers.getForTrade(trade.id)).toBeUndefined();
    const first = handlers.saveForTrade({ tradeId: trade.id, fields: { setup: "Absorption", confidence: 4 } });
    const updated = handlers.saveForTrade({ tradeId: trade.id, fields: { setup: "Pullback", delta: 0 } });
    expect(updated.createdAt).toBe(first.createdAt);
    expect(updated.fields).toEqual({ setup: "Pullback", delta: 0 });
    expect(handlers.listSamples()[0]).toMatchObject({ trade: { id: trade.id, aiReviewStatus: "not_generated" }, record: { fields: updated.fields } });
    expect(getTradeJournal(db, trade.id)?.content).toBe("independent");
    expect(db.prepare("select count(*) as n from trade_research").get()).toEqual({ n: 1 });
  });
  it("rejects invalid IPC values and nonexistent trades without writing", () => {
    const { db, trade } = database();
    expect(() => saveTradeResearch(db, { tradeId: trade.id, fields: { confidence: 6 } })).toThrow();
    expect(() => saveTradeResearch(db, { tradeId: 999, fields: {} })).toThrow("交易不存在");
    expect(() => getTradeResearch(db, -1)).toThrow("交易编号");
    expect(getTradeResearch(db, trade.id)).toBeUndefined();
  });
  it("deletes research through the trade foreign key", () => {
    const { db, trade } = database();
    saveTradeResearch(db, { tradeId: trade.id, fields: { setup: "A" } });
    db.prepare("delete from trade where id = ?").run(trade.id);
    expect(getTradeResearch(db, trade.id)).toBeUndefined();
    expect(listResearchSamples(db)).toEqual([]);
  });
  it("upgrades a v5 database while preserving trades, journals and custom prompts", () => {
    const { db, trade } = database();
    saveTradeJournal(db, { tradeId: trade.id, title: "old title", content: "old content" });
    db.exec("drop table trade_research; pragma user_version = 5;");
    db.prepare("insert into app_setting (key, value) values ('openai.prompt_version', 'custom-prompt')").run();
    runMigrations(db);
    runMigrations(db);
    expect(db.prepare("pragma user_version").get()).toEqual({ user_version: 6 });
    expect(getTradeJournal(db, trade.id)?.content).toBe("old content");
    expect(listResearchSamples(db)).toHaveLength(1);
    expect(db.prepare("select value from app_setting where key = 'openai.prompt_version'").get()).toEqual({ value: "custom-prompt" });
    saveTradeResearch(db, { tradeId: trade.id, fields: { confidence: 5 } });
    expect(getTradeResearch(db, trade.id)?.fields.confidence).toBe(5);
  });
});
