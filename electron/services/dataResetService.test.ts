import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { attachExistingFile } from "./attachmentService";
import { createClosedTrade } from "./tradeService";
import { resetLocalData, type DataResetServicePaths } from "./dataResetService";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createPaths(): DataResetServicePaths {
  const appDataDir = createTempDir("trading-ai-review-data-reset-");
  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

function seedData(paths: DataResetServicePaths) {
  const db = initializeAppDatabase(paths.databasePath);
  const trade = createClosedTrade(db, {
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
  db.prepare("insert into app_setting (key, value) values (?, ?)").run(
    "openai.model",
    "gpt-local",
  );

  const sourceFilePath = path.join(createTempDir("trading-ai-review-data-reset-source-"), "entry.png");
  writeFileSync(sourceFilePath, "entry screenshot");
  attachExistingFile(db, paths.attachmentsDir, {
    tradeId: trade.id,
    sourceFilePath,
    imageType: "entry",
    caption: "Entry",
    sortOrder: 0,
  });

  db.close();
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("resetLocalData", () => {
  it("requires the exact DELETE confirmation before touching data", async () => {
    const paths = createPaths();
    seedData(paths);

    await expect(
      resetLocalData(paths, {
        confirmationText: "delete",
        now: new Date("2026-06-11T12:00:00.000Z"),
        appVersion: "0.0.0-test",
      }),
    ).rejects.toThrow("Type DELETE to reset local data.");

    const db = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      db.prepare("select count(*) as count from trade").get() as { count: number }
    ).count;
    db.close();

    expect(tradeCount).toBe(1);
    expect(existsSync(paths.backupsDir)).toBe(false);
  });

  it("creates a safety backup and rebuilds an empty local database", async () => {
    const paths = createPaths();
    seedData(paths);

    const result = await resetLocalData(paths, {
      confirmationText: "DELETE",
      now: new Date("2026-06-11T12:00:00.000Z"),
      appVersion: "0.0.0-test",
    });

    const db = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      db.prepare("select count(*) as count from trade").get() as { count: number }
    ).count;
    const instrumentCount = (
      db.prepare("select count(*) as count from instrument").get() as {
        count: number;
      }
    ).count;
    const settingCount = (
      db.prepare("select count(*) as count from app_setting").get() as {
        count: number;
      }
    ).count;
    db.close();

    expect(result.safetyBackupFilePath).toMatch(
      /ai-trading-review-backup-2026-06-11T12-00-00-000Z-before-reset\.zip$/,
    );
    expect(existsSync(result.safetyBackupFilePath)).toBe(true);
    expect(tradeCount).toBe(0);
    expect(instrumentCount).toBe(4);
    expect(settingCount).toBe(0);
    expect(readdirSync(paths.attachmentsDir)).toEqual([]);
  });
});
