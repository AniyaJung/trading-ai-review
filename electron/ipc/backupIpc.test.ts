import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import type { BackupServicePaths } from "../services/backupService";
import { createBackup } from "../services/backupService";
import { attachExistingFile } from "../services/attachmentService";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "../services/tradeService";
import { createBackupIpcHandlers } from "./backupIpc";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createPaths(): BackupServicePaths {
  const appDataDir = createTempDir("trading-ai-review-backup-ipc-");
  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

function seedDatabase(paths: BackupServicePaths) {
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
  const sourceFilePath = path.join(createTempDir("trading-ai-review-backup-ipc-source-"), "entry.png");
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

describe("createBackupIpcHandlers", () => {
  it("creates a full backup and opens managed data directories", async () => {
    const paths = createPaths();
    const openedPaths: string[] = [];
    seedDatabase(paths);
    const handlers = createBackupIpcHandlers(paths, {
      appVersion: "0.0.0-test",
      now: () => new Date("2026-06-11T10:00:00.000Z"),
      openPath: async (targetPath) => {
        openedPaths.push(targetPath);
        return "";
      },
    });

    const result = await handlers.create();
    await handlers.openDataDirectory();
    await handlers.openBackupsDirectory();

    expect(result.filePath).toMatch(
      /ai-trading-review-backup-2026-06-11T10-00-00-000Z\.zip$/,
    );
    expect(existsSync(result.filePath)).toBe(true);
    expect(result.manifest.backupSchemaVersion).toBe(1);
    expect(openedPaths).toEqual([paths.appDataDir, paths.backupsDir]);
  });

  it("lists available backup history", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T10:00:00.000Z"),
      appVersion: "0.0.0-test",
    });
    const handlers = createBackupIpcHandlers(paths);

    const history = await handlers.listHistory();

    expect(history).toEqual([
      expect.objectContaining({
        filePath: backup.filePath,
        fileName: path.basename(backup.filePath),
        status: "restorable",
      }),
    ]);
  });

  it("restores the selected backup after closing the active database", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T10:00:00.000Z"),
      appVersion: "0.0.0-test",
    });
    const db = new DatabaseSync(paths.databasePath);
    db.exec("delete from trade");
    db.close();
    let closedDatabase = false;
    let afterRestoreCalled = false;
    const handlers = createBackupIpcHandlers(paths, {
      appVersion: "0.0.0-test",
      now: () => new Date("2026-06-11T10:05:00.000Z"),
      chooseBackupFile: async () => backup.filePath,
      closeDatabase: () => {
        closedDatabase = true;
      },
      afterRestore: () => {
        afterRestoreCalled = true;
      },
    });

    const restored = await handlers.chooseAndRestore();

    const restoredDb = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      restoredDb.prepare("select count(*) as count from trade").get() as {
        count: number;
      }
    ).count;
    restoredDb.close();

    expect(restored?.restoredFromFilePath).toBe(backup.filePath);
    expect(restored?.safetyBackupFilePath).toMatch(/before-restore\.zip$/);
    expect(closedDatabase).toBe(true);
    expect(afterRestoreCalled).toBe(true);
    expect(tradeCount).toBe(1);
  });

  it("restores a backup selected from history", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T10:00:00.000Z"),
      appVersion: "0.0.0-test",
    });
    const db = new DatabaseSync(paths.databasePath);
    db.exec("delete from trade");
    db.close();
    let closedDatabase = false;
    let afterRestoreCalled = false;
    const handlers = createBackupIpcHandlers(paths, {
      appVersion: "0.0.0-test",
      now: () => new Date("2026-06-11T10:05:00.000Z"),
      closeDatabase: () => {
        closedDatabase = true;
      },
      afterRestore: () => {
        afterRestoreCalled = true;
      },
    });

    const restored = await handlers.restoreFromHistory({ filePath: backup.filePath });

    const restoredDb = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      restoredDb.prepare("select count(*) as count from trade").get() as {
        count: number;
      }
    ).count;
    restoredDb.close();

    expect(restored.restoredFromFilePath).toBe(backup.filePath);
    expect(restored.safetyBackupFilePath).toMatch(/before-restore\.zip$/);
    expect(closedDatabase).toBe(true);
    expect(afterRestoreCalled).toBe(true);
    expect(tradeCount).toBe(1);
  });

  it("rejects history restore paths outside the managed backups directory", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const outsideDir = createTempDir("trading-ai-review-backup-ipc-outside-");
    const outsidePath = path.join(outsideDir, "outside.zip");
    writeFileSync(outsidePath, "not used");
    let closedDatabase = false;
    const handlers = createBackupIpcHandlers(paths, {
      closeDatabase: () => {
        closedDatabase = true;
      },
    });

    await expect(
      handlers.restoreFromHistory({ filePath: outsidePath }),
    ).rejects.toThrow("Backup file must be inside the managed backups directory.");

    expect(closedDatabase).toBe(false);
  });

  it("returns undefined when restore file selection is cancelled", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const handlers = createBackupIpcHandlers(paths, {
      chooseBackupFile: async () => undefined,
    });

    await expect(handlers.chooseAndRestore()).resolves.toBeUndefined();
  });

  it("fully rejects an invalid selected archive before closing the database", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const invalidBackupPath = path.join(paths.appDataDir, "invalid.zip");
    writeFileSync(invalidBackupPath, "not a zip");
    let closedDatabase = false;
    const handlers = createBackupIpcHandlers(paths, {
      chooseBackupFile: async () => invalidBackupPath,
      closeDatabase: () => {
        closedDatabase = true;
      },
    });

    await expect(handlers.chooseAndRestore()).rejects.toThrow();

    expect(closedDatabase).toBe(false);
  });

  it("runs the restore callback when commit fails after closing the database", async () => {
    const paths = createPaths();
    seedDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T10:00:00.000Z"),
      appVersion: "0.0.0-test",
    });
    let afterRestoreCalled = false;
    const handlers = createBackupIpcHandlers(paths, {
      chooseBackupFile: async () => backup.filePath,
      closeDatabase: () => {
        rmSync(paths.databasePath);
        mkdirSync(paths.databasePath);
      },
      afterRestore: () => {
        afterRestoreCalled = true;
      },
    });

    await expect(handlers.chooseAndRestore()).rejects.toThrow();

    expect(afterRestoreCalled).toBe(true);
  });
});
