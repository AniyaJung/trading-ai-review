import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { InstrumentConfig } from "../../shared/contracts/desktopApi.js";
import { deriveTradeDateSemantics } from "../../shared/trading/tradeDates.js";

const supportedDatabaseVersion = 2;

export type InstrumentPreset = InstrumentConfig;

const futuresInstrumentPresets: InstrumentPreset[] = [
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
];

export function initializeAppDatabase(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("pragma foreign_keys = ON");
  runMigrations(db);
  return db;
}

export function runMigrations(db: DatabaseSync) {
  const currentVersion = getUserVersion(db);

  if (currentVersion > supportedDatabaseVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${supportedDatabaseVersion}.`,
    );
  }

  if (currentVersion === 0) {
    db.exec("begin immediate");
    try {
      createVersionOneSchema(db);
      seedInstrumentPresets(db);
      db.exec(`pragma user_version = ${supportedDatabaseVersion}`);
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
    return;
  }

  if (currentVersion < 2) {
    migrateToVersionTwo(db);
  }
}

export function listInstrumentPresets(db: DatabaseSync): InstrumentPreset[] {
  return db
    .prepare(
      `select
        symbol,
        name,
        asset_class as assetClass,
        exchange,
        currency,
        tick_size as tickSize,
        tick_value as tickValue,
        point_value as pointValue
      from instrument
      order by case symbol
        when 'ES' then 1
        when 'MES' then 2
        when 'NQ' then 3
        when 'MNQ' then 4
        else 99
      end`,
    )
    .all() as unknown as InstrumentPreset[];
}

function createVersionOneSchema(db: DatabaseSync) {
  db.exec(`
    create table instrument (
      id integer primary key autoincrement,
      symbol text not null unique,
      name text not null,
      asset_class text not null check (asset_class in ('futures', 'stock', 'crypto', 'forex', 'etf')),
      exchange text,
      currency text not null,
      tick_size real not null,
      tick_value real not null,
      point_value real not null,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table entry_rule (
      id integer primary key autoincrement,
      name text not null,
      description text,
      market_type text,
      status text not null default 'active' check (status in ('active', 'archived')),
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table entry_rule_version (
      id integer primary key autoincrement,
      entry_rule_id integer not null references entry_rule(id) on delete cascade,
      version_no integer not null,
      content text not null,
      checklist_json text not null default '[]',
      created_at text not null default (datetime('now')),
      unique (entry_rule_id, version_no)
    );

    create table trade (
      id integer primary key autoincrement,
      instrument_id integer not null references instrument(id),
      entry_rule_id integer references entry_rule(id),
      entry_rule_version_id integer references entry_rule_version(id),
      direction text not null check (direction in ('long', 'short')),
      status text not null default 'closed' check (status = 'closed'),
      opened_at text not null,
      user_local_date text not null,
      market_session_date text not null,
      closed_at text not null,
      entry_price_avg real not null,
      exit_price_avg real not null,
      quantity real not null check (quantity > 0),
      stop_loss_price real,
      take_profit_price real,
      fees_total real not null default 0,
      gross_pnl real,
      net_pnl real,
      risk_amount real,
      r_multiple real,
      background_note text,
      entry_reason text,
      exit_reason text,
      emotion_note text,
      lesson_note text,
      ai_review_status text not null default 'not_generated' check (
        ai_review_status in ('not_generated', 'draft', 'needs_review', 'confirmed', 'corrected', 'invalid')
      ),
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      check (closed_at >= opened_at)
    );

    create table trade_execution (
      id integer primary key autoincrement,
      trade_id integer not null references trade(id) on delete cascade,
      executed_at text not null,
      side text not null check (side in ('buy', 'sell')),
      price real not null,
      quantity real not null check (quantity > 0),
      fee real not null default 0,
      fee_currency text,
      execution_type text not null check (execution_type in ('entry', 'exit', 'add', 'reduce')),
      created_at text not null default (datetime('now'))
    );

    create table trade_attachment (
      id integer primary key autoincrement,
      trade_id integer not null references trade(id) on delete cascade,
      image_type text not null check (image_type in ('before_entry', 'entry', 'holding', 'exit', 'review_marked')),
      file_path text not null,
      caption text,
      sort_order integer not null default 0,
      created_at text not null default (datetime('now'))
    );

    create table ai_review (
      id integer primary key autoincrement,
      trade_id integer not null references trade(id) on delete cascade,
      status text not null check (status in ('draft', 'confirmed', 'corrected', 'needs_review', 'invalid')),
      model text,
      prompt_version text,
      rule_version_snapshot text,
      score_total real,
      summary text,
      facts_json text not null default '{}',
      missing_info_json text not null default '[]',
      image_observations_json text not null default '[]',
      strengths_json text not null default '[]',
      weaknesses_json text not null default '[]',
      suggestions_json text not null default '[]',
      tags_json text not null default '[]',
      confidence real,
      raw_result_json text not null default '{}',
      created_at text not null default (datetime('now')),
      confirmed_at text
    );

    create table trade_rule_check (
      id integer primary key autoincrement,
      trade_id integer not null references trade(id) on delete cascade,
      entry_rule_version_id integer not null references entry_rule_version(id),
      check_item text not null,
      result text not null check (result in ('pass', 'fail', 'unknown')),
      evidence text,
      comment text,
      score_delta real,
      created_at text not null default (datetime('now'))
    );

    create table tag (
      id integer primary key autoincrement,
      name text not null,
      category text not null check (category in ('mistake', 'emotion', 'setup', 'market')),
      created_at text not null default (datetime('now')),
      unique (name, category)
    );

    create table trade_tag_map (
      trade_id integer not null references trade(id) on delete cascade,
      tag_id integer not null references tag(id) on delete cascade,
      primary key (trade_id, tag_id)
    );

    create table app_setting (
      key text primary key,
      value text not null,
      updated_at text not null default (datetime('now'))
    );

    create index idx_trade_opened_at on trade(opened_at);
    create index idx_trade_user_local_date on trade(user_local_date);
    create index idx_trade_market_session_date on trade(market_session_date);
    create index idx_trade_instrument_id on trade(instrument_id);
    create index idx_trade_rule_version_id on trade(entry_rule_version_id);
    create index idx_ai_review_trade_status on ai_review(trade_id, status);
  `);
}

function migrateToVersionTwo(db: DatabaseSync) {
  db.exec("begin immediate");
  try {
    const columns = getTableColumns(db, "trade");

    if (!columns.has("user_local_date")) {
      db.exec("alter table trade add column user_local_date text");
    }

    if (!columns.has("market_session_date")) {
      db.exec("alter table trade add column market_session_date text");
    }

    const rows = db
      .prepare(
        `select id, opened_at as openedAt
         from trade
         where user_local_date is null
            or user_local_date = ''
            or market_session_date is null
            or market_session_date = ''`,
      )
      .all() as Array<{ id: number; openedAt: string }>;
    const update = db.prepare(
      `update trade
       set user_local_date = ?,
           market_session_date = ?
       where id = ?`,
    );

    for (const row of rows) {
      const dates = deriveTradeDateSemantics(row.openedAt);
      update.run(dates.userLocalDate, dates.marketSessionDate, row.id);
    }

    db.exec(`
      create index if not exists idx_trade_user_local_date on trade(user_local_date);
      create index if not exists idx_trade_market_session_date on trade(market_session_date);
      pragma user_version = 2;
    `);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function getTableColumns(db: DatabaseSync, tableName: string) {
  return new Set(
    db
      .prepare(`pragma table_info(${tableName})`)
      .all()
      .map((row) => (row as { name: string }).name),
  );
}

function seedInstrumentPresets(db: DatabaseSync) {
  const insert = db.prepare(`
    insert into instrument (
      symbol,
      name,
      asset_class,
      exchange,
      currency,
      tick_size,
      tick_value,
      point_value
    ) values (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    )
    on conflict(symbol) do nothing
  `);

  for (const preset of futuresInstrumentPresets) {
    insert.run(
      preset.symbol,
      preset.name,
      preset.assetClass,
      preset.exchange,
      preset.currency,
      preset.tickSize,
      preset.tickValue,
      preset.pointValue,
    );
  }
}

function getUserVersion(db: DatabaseSync) {
  const row = db.prepare("pragma user_version").get() as
    | { user_version: number }
    | undefined;
  return Number(row?.user_version ?? 0);
}
