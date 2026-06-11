import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { attachExistingFile } from "./attachmentService";
import {
  createBackup,
  restoreBackup,
  type BackupManifest,
  type BackupServicePaths,
} from "./backupService";
import { createClosedTrade } from "./tradeService";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createPaths(): BackupServicePaths {
  const appDataDir = createTempDir("trading-ai-review-backup-service-");
  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

function createSeededDatabase(paths: BackupServicePaths) {
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
  const sourceFilePath = path.join(createTempDir("trading-ai-review-backup-source-"), "entry.png");
  writeFileSync(sourceFilePath, "entry screenshot");
  const attachment = attachExistingFile(db, paths.attachmentsDir, {
    tradeId: trade.id,
    sourceFilePath,
    imageType: "entry",
    caption: "Entry",
    sortOrder: 0,
  });

  db.close();

  return { trade, attachment };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createBackup", () => {
  it("exports SQLite, attachments, and a checksum manifest into a zip", async () => {
    const paths = createPaths();
    const { attachment } = createSeededDatabase(paths);

    const result = await createBackup(paths, {
      now: new Date("2026-06-11T09:30:00.000Z"),
      appVersion: "0.0.0-test",
    });

    const zip = await JSZip.loadAsync(readFileSync(result.filePath));
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    ) as BackupManifest;

    expect(path.dirname(result.filePath)).toBe(paths.backupsDir);
    expect(path.basename(result.filePath)).toBe(
      "ai-trading-review-backup-2026-06-11T09-30-00-000Z.zip",
    );
    expect(zip.file("app.sqlite")).toBeTruthy();
    expect(zip.file(`attachments/${path.basename(attachment.filePath)}`)).toBeTruthy();
    expect(manifest).toEqual(
      expect.objectContaining({
        backupSchemaVersion: 1,
        appVersion: "0.0.0-test",
        exportedAt: "2026-06-11T09:30:00.000Z",
        databaseFile: "app.sqlite",
      }),
    );
    expect(manifest.attachments).toEqual([
      expect.objectContaining({
        path: `attachments/${path.basename(attachment.filePath)}`,
        sha256: expect.any(String),
      }),
    ]);
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "app.sqlite", sha256: expect.any(String) }),
        expect.objectContaining({
          path: `attachments/${path.basename(attachment.filePath)}`,
          sha256: expect.any(String),
        }),
      ]),
    );
  });
});

describe("restoreBackup", () => {
  it("creates a safety backup before replacing SQLite and attachments", async () => {
    const paths = createPaths();
    const { attachment } = createSeededDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T09:30:00.000Z"),
      appVersion: "0.0.0-test",
    });

    const db = new DatabaseSync(paths.databasePath);
    db.exec("delete from trade");
    db.close();
    writeFileSync(path.join(paths.attachmentsDir, "current-only.png"), "remove me on restore");

    const restored = await restoreBackup(paths, backup.filePath, {
      now: new Date("2026-06-11T09:45:00.000Z"),
      appVersion: "0.0.0-test",
    });

    const restoredDb = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      restoredDb.prepare("select count(*) as count from trade").get() as {
        count: number;
      }
    ).count;
    restoredDb.close();

    expect(restored.safetyBackupFilePath).toMatch(
      /ai-trading-review-backup-2026-06-11T09-45-00-000Z-before-restore\.zip$/,
    );
    expect(existsSync(restored.safetyBackupFilePath)).toBe(true);
    expect(tradeCount).toBe(1);
    expect(existsSync(attachment.filePath)).toBe(true);
    expect(existsSync(path.join(paths.attachmentsDir, "current-only.png"))).toBe(false);
    expect(restored.manifest.databaseFile).toBe("app.sqlite");
  });
});
