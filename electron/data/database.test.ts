import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  initializeAppDatabase,
  listInstrumentPresets,
  runMigrations,
} from "./database";

const tempDirs: string[] = [];

function createTempDbPath() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-"));
  tempDirs.push(dir);
  return path.join(dir, "app.sqlite");
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("initializeAppDatabase", () => {
  it("creates the core schema and records the migration version", () => {
    const db = initializeAppDatabase(createTempDbPath());

    const tableRows = db
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
      )
      .all();
    const tableNames = tableRows.map((row) => (row as { name: string }).name);
    const userVersion = (
      db.prepare("pragma user_version").get() as { user_version: number }
    ).user_version;

    expect(tableNames).toEqual([
      "ai_review",
      "app_setting",
      "entry_rule",
      "entry_rule_version",
      "instrument",
      "tag",
      "trade",
      "trade_attachment",
      "trade_execution",
      "trade_rule_check",
      "trade_tag_map",
    ]);
    expect(userVersion).toBe(2);

    const tradeColumns = db
      .prepare("pragma table_info(trade)")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tradeColumns).toEqual(
      expect.arrayContaining(["user_local_date", "market_session_date"]),
    );

    const tradeIndexes = db
      .prepare("pragma index_list(trade)")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tradeIndexes).toEqual(
      expect.arrayContaining([
        "idx_trade_user_local_date",
        "idx_trade_market_session_date",
      ]),
    );

    db.close();
  });

  it("seeds futures instrument presets exactly once", () => {
    const db = initializeAppDatabase(createTempDbPath());

    runMigrations(db);
    const instruments = listInstrumentPresets(db);

    expect(instruments).toEqual([
      {
        symbol: "ES",
        name: "E-mini S&P 500",
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 12.5,
        pointValue: 50,
      },
      {
        symbol: "MES",
        name: "Micro E-mini S&P 500",
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 1.25,
        pointValue: 5,
      },
      {
        symbol: "NQ",
        name: "E-mini Nasdaq-100",
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 5,
        pointValue: 20,
      },
      {
        symbol: "MNQ",
        name: "Micro E-mini Nasdaq-100",
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 0.5,
        pointValue: 2,
      },
    ]);

    db.close();
  });

  it("rejects open trades in the MVP schema", () => {
    const db = initializeAppDatabase(createTempDbPath());
    const instrumentRow = db
      .prepare("select id from instrument where symbol = ?")
      .get("ES");
    const instrumentId = (instrumentRow as { id: number }).id;

    expect(() => {
      db.prepare(
        `insert into trade (
          instrument_id,
          direction,
          status,
          opened_at,
          user_local_date,
          market_session_date,
          closed_at,
          entry_price_avg,
          exit_price_avg,
          quantity,
          fees_total
        ) values (?, 'long', 'open', ?, ?, ?, ?, 5300, 5304.5, 2, 5)`,
      ).run(
        instrumentId,
        "2026-06-08T14:41:00.000Z",
        "2026-06-08",
        "2026-06-08",
        "2026-06-08T15:20:00.000Z",
      );
    }).toThrow();

    db.close();
  });
});

describe("runMigrations", () => {
  it("migrates v1 trades with user local and market session dates", () => {
    const db = new DatabaseSync(createTempDbPath());
    db.exec(`
      create table instrument (
        id integer primary key autoincrement,
        symbol text not null unique,
        name text not null,
        asset_class text not null,
        exchange text,
        currency text not null,
        tick_size real not null,
        tick_value real not null,
        point_value real not null,
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now'))
      );

      create table trade (
        id integer primary key autoincrement,
        instrument_id integer not null references instrument(id),
        direction text not null check (direction in ('long', 'short')),
        status text not null default 'closed' check (status = 'closed'),
        opened_at text not null,
        closed_at text not null,
        entry_price_avg real not null,
        exit_price_avg real not null,
        quantity real not null check (quantity > 0),
        fees_total real not null default 0,
        ai_review_status text not null default 'not_generated',
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now'))
      );
      insert into instrument (
        symbol, name, asset_class, exchange, currency, tick_size, tick_value, point_value
      ) values ('ES', 'E-mini S&P 500', 'futures', 'CME', 'USD', 0.25, 12.5, 50);
      insert into trade (
        instrument_id, direction, opened_at, closed_at, entry_price_avg,
        exit_price_avg, quantity, fees_total
      ) values (
        1, 'long', '2026-06-11T22:30:00.000Z', '2026-06-11T23:00:00.000Z',
        5300, 5304.5, 1, 2
      );
      pragma user_version = 1;
    `);

    runMigrations(db);

    const row = db.prepare(
      `select user_local_date as userLocalDate,
              market_session_date as marketSessionDate
       from trade
       where id = 1`,
    ).get() as { userLocalDate: string; marketSessionDate: string };

    expect(row.userLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.marketSessionDate).toBe("2026-06-12");
    expect(
      (db.prepare("pragma user_version").get() as { user_version: number })
        .user_version,
    ).toBe(2);

    db.close();
  });

  it("fails when the database is newer than the app supports", () => {
    const db = new DatabaseSync(createTempDbPath());
    db.exec("pragma user_version = 99");

    expect(() => runMigrations(db)).toThrow(
      "Database version 99 is newer than supported version 2.",
    );

    db.close();
  });
});
