import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade, listTrades } from "./tradeService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-trades-"));
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

describe("createClosedTrade", () => {
  it("saves a closed futures trade with calculated PnL and entry/exit executions", () => {
    const db = createTestDb();

    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      takeProfitPrice: 5306,
      feesTotal: 5,
      entryReason: "Opening range pullback",
      exitReason: "Scaled out at target area",
    });

    expect(trade).toMatchObject({
      id: 1,
      symbol: "ES",
      direction: "long",
      status: "closed",
      entryPriceAvg: 5300,
      exitPriceAvg: 5304.5,
      quantity: 2,
      grossPnl: 450,
      netPnl: 445,
      riskAmount: 200,
      rMultiple: 2.225,
      aiReviewStatus: "not_generated",
    });

    const executions = db
      .prepare(
        `select side, price, quantity, fee, fee_currency as feeCurrency, execution_type as executionType
         from trade_execution
         where trade_id = ?
         order by id`,
      )
      .all(trade.id);

    expect(executions).toEqual([
      {
        side: "buy",
        price: 5300,
        quantity: 2,
        fee: 0,
        feeCurrency: "USD",
        executionType: "entry",
      },
      {
        side: "sell",
        price: 5304.5,
        quantity: 2,
        fee: 5,
        feeCurrency: "USD",
        executionType: "exit",
      },
    ]);

    db.close();
  });

  it("rejects unknown instruments", () => {
    const db = createTestDb();

    expect(() =>
      createClosedTrade(db, {
        symbol: "YM",
        direction: "long",
        openedAt: "2026-06-08T14:41:00.000Z",
        closedAt: "2026-06-08T15:20:00.000Z",
        entryPrice: 39000,
        exitPrice: 39020,
        quantity: 1,
        stopLossPrice: 38980,
        feesTotal: 5,
      }),
    ).toThrow("Instrument YM is not configured.");

    db.close();
  });
});

describe("listTrades", () => {
  it("returns recent trades in reverse open time order", () => {
    const db = createTestDb();

    createClosedTrade(db, {
      symbol: "MNQ",
      direction: "short",
      openedAt: "2026-06-07T15:18:00.000Z",
      closedAt: "2026-06-07T16:02:00.000Z",
      entryPrice: 19000,
      exitPrice: 18984,
      quantity: 3,
      stopLossPrice: 19008,
      feesTotal: 3.6,
    });
    createClosedTrade(db, {
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

    expect(listTrades(db)).toEqual([
      expect.objectContaining({
        id: 2,
        symbol: "ES",
        netPnl: 445,
        rMultiple: 2.225,
      }),
      expect.objectContaining({
        id: 1,
        symbol: "MNQ",
        netPnl: 92.4,
        rMultiple: 1.925,
      }),
    ]);

    db.close();
  });
});
