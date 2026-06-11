import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createDatabaseIpcHandlers } from "./databaseIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-db-ipc-"));
  tempDirs.push(dir);
  return {
    db: initializeAppDatabase(path.join(dir, "app.sqlite")),
    paths: {
      appDataDir: dir,
      databasePath: path.join(dir, "app.sqlite"),
      attachmentsDir: path.join(dir, "attachments"),
      backupsDir: path.join(dir, "backups"),
    },
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

describe("createDatabaseIpcHandlers", () => {
  it("exposes database status and seeded instrument configuration", () => {
    const { db, paths } = createTestDb();
    const handlers = createDatabaseIpcHandlers(db, paths);

    expect(handlers.getStatus()).toEqual({
      databasePath: paths.databasePath,
      appDataDir: paths.appDataDir,
      instrumentCount: 4,
      migrationVersion: 1,
    });
    expect(handlers.listInstruments()).toEqual([
      expect.objectContaining({
        symbol: "ES",
        tickValue: 12.5,
        pointValue: 50,
      }),
      expect.objectContaining({
        symbol: "MES",
        pointValue: 5,
      }),
      expect.objectContaining({
        symbol: "NQ",
        pointValue: 20,
      }),
      expect.objectContaining({
        symbol: "MNQ",
        pointValue: 2,
      }),
    ]);

    db.close();
  });
});
