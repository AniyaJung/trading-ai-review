import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createTradeIpcHandlers } from "./tradeIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-ipc-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createTradeIpcHandlers", () => {
  it("lists and creates closed trades through narrow handlers", () => {
    const db = createTestDb();
    const handlers = createTradeIpcHandlers(db);

    expect(handlers.list()).toEqual([]);

    const created = handlers.createClosed({
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      feesTotal: 5,
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 1,
        symbol: "ES",
        netPnl: 445,
        rMultiple: 2.225,
      }),
    );
    expect(handlers.list()).toHaveLength(1);

    db.close();
  });
});
