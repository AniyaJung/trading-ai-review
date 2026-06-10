import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import {
  createClosedTrade,
  deleteTrade,
  getTradeDetail,
  listTrades,
  updateClosedTrade,
  type CreateClosedTradeInput,
} from "./tradeService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-trades-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

function validClosedTradeInput(
  overrides: Partial<CreateClosedTradeInput> = {},
): CreateClosedTradeInput {
  return {
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
    ...overrides,
  };
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

  it("rejects invalid quantity and fee values before inserting", () => {
    const db = createTestDb();

    expect(() =>
      createClosedTrade(db, validClosedTradeInput({ quantity: 0 })),
    ).toThrow("Quantity must be a positive whole number.");
    expect(() =>
      createClosedTrade(db, validClosedTradeInput({ quantity: 1.5 })),
    ).toThrow("Quantity must be a positive whole number.");
    expect(() =>
      createClosedTrade(db, validClosedTradeInput({ feesTotal: -1 })),
    ).toThrow("Fees total cannot be negative.");
    expect(listTrades(db)).toEqual([]);

    db.close();
  });

  it("rejects invalid price and direction values before inserting", () => {
    const db = createTestDb();

    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({ entryPrice: Number.NaN }),
      ),
    ).toThrow("Entry price must be a finite number.");
    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({ exitPrice: Number.POSITIVE_INFINITY }),
      ),
    ).toThrow("Exit price must be a finite number.");
    expect(() =>
      createClosedTrade(db, validClosedTradeInput({ stopLossPrice: 0 })),
    ).toThrow("Stop loss price must be greater than 0.");
    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({ takeProfitPrice: Number.NaN }),
      ),
    ).toThrow("Take profit price must be a finite number.");
    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({ direction: "sideways" as never }),
      ),
    ).toThrow("Direction must be long or short.");
    expect(listTrades(db)).toEqual([]);

    db.close();
  });

  it("rejects closed times before opened times", () => {
    const db = createTestDb();

    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({
          openedAt: "2026-06-08T15:20:00.000Z",
          closedAt: "2026-06-08T14:41:00.000Z",
        }),
      ),
    ).toThrow("Closed time must be after opened time.");
    expect(listTrades(db)).toEqual([]);

    db.close();
  });

  it("rejects stop loss placement that does not define risk", () => {
    const db = createTestDb();

    expect(() =>
      createClosedTrade(db, validClosedTradeInput({ stopLossPrice: 5300 })),
    ).toThrow("Long trades require stop loss below entry price.");
    expect(() =>
      createClosedTrade(
        db,
        validClosedTradeInput({
          direction: "short",
          stopLossPrice: 5299,
        }),
      ),
    ).toThrow("Short trades require stop loss above entry price.");
    expect(listTrades(db)).toEqual([]);

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

describe("getTradeDetail", () => {
  it("returns trade facts, notes, and generated entry/exit executions", () => {
    const db = createTestDb();

    const created = createClosedTrade(db, {
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
      backgroundNote: "Morning trend day",
      entryReason: "Opening range pullback",
      exitReason: "Scaled out at target area",
      emotionNote: "Calm",
      lessonNote: "Wait for retest",
    });

    expect(getTradeDetail(db, created.id)).toEqual({
      ...created,
      stopLossPrice: 5298,
      takeProfitPrice: 5306,
      backgroundNote: "Morning trend day",
      entryReason: "Opening range pullback",
      exitReason: "Scaled out at target area",
      emotionNote: "Calm",
      lessonNote: "Wait for retest",
      executions: [
        {
          id: 1,
          executedAt: "2026-06-08T14:41:00.000Z",
          side: "buy",
          price: 5300,
          quantity: 2,
          fee: 0,
          feeCurrency: "USD",
          executionType: "entry",
        },
        {
          id: 2,
          executedAt: "2026-06-08T15:20:00.000Z",
          side: "sell",
          price: 5304.5,
          quantity: 2,
          fee: 5,
          feeCurrency: "USD",
          executionType: "exit",
        },
      ],
    });

    db.close();
  });

  it("returns undefined for unknown trades", () => {
    const db = createTestDb();

    expect(getTradeDetail(db, 999)).toBeUndefined();

    db.close();
  });
});

describe("deleteTrade", () => {
  it("deletes a trade and cascades generated executions", () => {
    const db = createTestDb();
    const created = createClosedTrade(db, validClosedTradeInput());

    expect(deleteTrade(db, created.id)).toBe(true);
    expect(listTrades(db)).toEqual([]);
    expect(getTradeDetail(db, created.id)).toBeUndefined();
    expect(
      db
        .prepare("select count(*) as count from trade_execution where trade_id = ?")
        .get(created.id),
    ).toEqual({ count: 0 });

    db.close();
  });

  it("returns false when deleting an unknown trade", () => {
    const db = createTestDb();

    expect(deleteTrade(db, 999)).toBe(false);

    db.close();
  });
});

describe("updateClosedTrade", () => {
  it("updates trade facts, recalculates PnL, and rebuilds entry/exit executions", () => {
    const db = createTestDb();
    const created = createClosedTrade(db, validClosedTradeInput());

    const updated = updateClosedTrade(
      db,
      created.id,
      validClosedTradeInput({
        symbol: "MNQ",
        direction: "short",
        openedAt: "2026-06-09T15:18:00.000Z",
        closedAt: "2026-06-09T16:02:00.000Z",
        entryPrice: 19000,
        exitPrice: 18984,
        quantity: 3,
        stopLossPrice: 19008,
        takeProfitPrice: 18980,
        feesTotal: 3.6,
        entryReason: "Failed breakout",
        exitReason: "Covered near target",
      }),
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        symbol: "MNQ",
        direction: "short",
        openedAt: "2026-06-09T15:18:00.000Z",
        closedAt: "2026-06-09T16:02:00.000Z",
        entryPriceAvg: 19000,
        exitPriceAvg: 18984,
        quantity: 3,
        grossPnl: 96,
        netPnl: 92.4,
        riskAmount: 48,
        rMultiple: 1.925,
      }),
    );

    expect(getTradeDetail(db, created.id)).toEqual(
      expect.objectContaining({
        symbol: "MNQ",
        stopLossPrice: 19008,
        takeProfitPrice: 18980,
        entryReason: "Failed breakout",
        exitReason: "Covered near target",
        executions: [
          expect.objectContaining({
            side: "sell",
            price: 19000,
            quantity: 3,
            fee: 0,
            feeCurrency: "USD",
            executionType: "entry",
          }),
          expect.objectContaining({
            side: "buy",
            price: 18984,
            quantity: 3,
            fee: 3.6,
            feeCurrency: "USD",
            executionType: "exit",
          }),
        ],
      }),
    );

    db.close();
  });

  it("returns undefined when updating an unknown trade", () => {
    const db = createTestDb();

    expect(updateClosedTrade(db, 999, validClosedTradeInput())).toBeUndefined();

    db.close();
  });
});
