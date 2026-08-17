import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "../services/tradeService";
import { createTagIpcHandlers } from "./tagIpc";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createTagIpcHandlers", () => {
  it("manages the tag library and trade assignments through narrow handlers", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-tag-ipc-"));
    tempDirs.push(dir);
    const db = initializeAppDatabase(path.join(dir, "app.sqlite"));
    const trade = createClosedTrade(db, {
      symbol: "MNQ",
      direction: "short",
      openedAt: "2026-08-05T03:00:00.000Z",
      closedAt: "2026-08-05T03:20:00.000Z",
      entryPrice: 23000,
      exitPrice: 22990,
      quantity: 1,
      stopLossPrice: 23005,
      feesTotal: 1.2,
    });
    const handlers = createTagIpcHandlers(db);
    const tag = handlers.create({ name: "FOMO", category: "emotion" });

    expect(handlers.list()).toHaveLength(1);
    expect(
      handlers.assignManual({ tradeId: trade.id, tagId: tag.id }),
    ).toEqual(expect.objectContaining({ source: "manual" }));
    expect(handlers.listForTrade(trade.id)).toHaveLength(1);
    expect(
      handlers.removeFromTrade({ tradeId: trade.id, tagId: tag.id }),
    ).toBe(true);
    expect(handlers.delete(tag.id)).toEqual({
      deleted: true,
      affectedTradeCount: 0,
    });

    db.close();
  });
});
