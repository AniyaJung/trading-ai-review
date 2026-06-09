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
    expect(userVersion).toBe(1);

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
          closed_at,
          entry_price_avg,
          exit_price_avg,
          quantity,
          fees_total
        ) values (?, 'long', 'open', ?, ?, 5300, 5304.5, 2, 5)`,
      ).run(instrumentId, "2026-06-08T14:41:00.000Z", "2026-06-08T15:20:00.000Z");
    }).toThrow();

    db.close();
  });
});

describe("runMigrations", () => {
  it("fails when the database is newer than the app supports", () => {
    const db = new DatabaseSync(createTempDbPath());
    db.exec("pragma user_version = 99");

    expect(() => runMigrations(db)).toThrow(
      "Database version 99 is newer than supported version 1.",
    );

    db.close();
  });
});
