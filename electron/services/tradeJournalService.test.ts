import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "./tradeService";
import { getTradeJournal, saveTradeJournal } from "./tradeJournalService";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("tradeJournalService", () => {
  it("upserts one journal article per trade", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-journal-"));
    tempDirs.push(dir);
    const db = initializeAppDatabase(path.join(dir, "app.sqlite"));
    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 1,
      stopLossPrice: 5298,
      feesTotal: 2,
    });

    expect(getTradeJournal(db, trade.id)).toBeUndefined();
    saveTradeJournal(db, {
      tradeId: trade.id,
      title: "开盘回踩复盘",
      content: "先记录事实，再记录执行。",
    });
    const journal = saveTradeJournal(db, {
      tradeId: trade.id,
      title: "更新后的标题",
      content: "补充了离场原因。",
    });

    expect(journal).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        title: "更新后的标题",
        content: "补充了离场原因。",
      }),
    );
    expect(
      (db.prepare("select count(*) as count from trade_journal").get() as { count: number })
        .count,
    ).toBe(1);
    db.close();
  });
});
