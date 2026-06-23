import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { attachExistingFile } from "./attachmentService";
import {
  createBackup,
  listBackupHistory,
  prepareRestoreBackup,
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

function checksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writeCustomBackup(
  paths: BackupServicePaths,
  options: {
    attachmentPath: string;
    includeAttachmentInFiles?: boolean;
    attachmentManifestSha256?: string;
    extraArchiveAttachmentPath?: string;
  },
) {
  const database = readFileSync(paths.databasePath);
  const attachment = Buffer.from("attachment contents");
  const databaseFile = {
    path: "app.sqlite",
    sha256: checksum(database),
    bytes: database.byteLength,
  };
  const attachmentFile = {
    path: options.attachmentPath,
    sha256: options.attachmentManifestSha256 ?? checksum(attachment),
    bytes: attachment.byteLength,
  };
  const manifest: BackupManifest = {
    backupSchemaVersion: 1,
    appVersion: "0.0.0-test",
    exportedAt: "2026-06-11T09:30:00.000Z",
    databaseFile: "app.sqlite",
    attachments: [attachmentFile],
    files:
      options.includeAttachmentInFiles === false
        ? [databaseFile]
        : [databaseFile, { ...attachmentFile, sha256: checksum(attachment) }],
  };
  const zip = new JSZip();
  zip.file("app.sqlite", database);
  zip.file(options.attachmentPath, attachment);
  if (options.extraArchiveAttachmentPath) {
    zip.file(options.extraArchiveAttachmentPath, "unchecked contents");
  }
  zip.file("manifest.json", JSON.stringify(manifest));
  mkdirSync(paths.backupsDir, { recursive: true });
  const backupPath = path.join(paths.backupsDir, `custom-${Date.now()}.zip`);
  writeFileSync(backupPath, await zip.generateAsync({ type: "nodebuffer" }));
  return backupPath;
}

afterEach(() => {
  vi.restoreAllMocks();
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

describe("listBackupHistory", () => {
  it("lists backup zip files newest first with manifest metadata", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const older = await createBackup(paths, {
      now: new Date("2026-06-11T09:30:00.000Z"),
      appVersion: "0.0.0-test",
    });
    const newer = await createBackup(paths, {
      now: new Date("2026-06-11T10:30:00.000Z"),
      appVersion: "0.0.1-test",
    });

    const history = await listBackupHistory(paths);

    expect(history.map((item) => item.filePath)).toEqual([
      newer.filePath,
      older.filePath,
    ]);
    expect(history[0]).toEqual(
      expect.objectContaining({
        appVersion: "0.0.1-test",
        backupSchemaVersion: 1,
        exportedAt: "2026-06-11T10:30:00.000Z",
        fileName: path.basename(newer.filePath),
        status: "restorable",
      }),
    );
    expect(history[0].sizeBytes).toBeGreaterThan(0);
  });

  it("marks unreadable and unsupported backup packages without throwing", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backup = await createBackup(paths, {
      now: new Date("2026-06-11T09:30:00.000Z"),
      appVersion: "0.0.0-test",
    });
    const zip = await JSZip.loadAsync(readFileSync(backup.filePath));
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    ) as BackupManifest;
    zip.file(
      "manifest.json",
      JSON.stringify({ ...manifest, backupSchemaVersion: 999 }, null, 2),
    );
    writeFileSync(
      path.join(paths.backupsDir, "future-version.zip"),
      await zip.generateAsync({ type: "nodebuffer" }),
    );
    writeFileSync(path.join(paths.backupsDir, "not-a-backup.zip"), "not a zip");

    const history = await listBackupHistory(paths);

    expect(
      history.find((item) => item.fileName === "future-version.zip"),
    ).toEqual(
      expect.objectContaining({
        backupSchemaVersion: 999,
        status: "unsupported-version",
      }),
    );
    expect(history.find((item) => item.fileName === "not-a-backup.zip")).toEqual(
      expect.objectContaining({
        backupSchemaVersion: null,
        exportedAt: null,
        status: "invalid",
      }),
    );
  });

  it("parses backup packages newest first with only one full package active", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const older = await createBackup(paths, {
      now: new Date("2026-06-11T09:30:00.000Z"),
      appVersion: "older",
    });
    const newer = await createBackup(paths, {
      now: new Date("2026-06-11T10:30:00.000Z"),
      appVersion: "newer",
    });
    utimesSync(older.filePath, new Date("2026-06-11T09:30:00.000Z"), new Date("2026-06-11T09:30:00.000Z"));
    utimesSync(newer.filePath, new Date("2026-06-11T10:30:00.000Z"), new Date("2026-06-11T10:30:00.000Z"));
    const olderBuffer = readFileSync(older.filePath);
    const newerBuffer = readFileSync(newer.filePath);
    const processingOrder: string[] = [];
    let activePackages = 0;
    let maxActivePackages = 0;
    const originalLoadAsync = JSZip.loadAsync.bind(JSZip);
    vi.spyOn(JSZip, "loadAsync").mockImplementation(async (data) => {
      const buffer = data as Buffer;
      processingOrder.push(buffer.equals(newerBuffer) ? "newer" : buffer.equals(olderBuffer) ? "older" : "unknown");
      activePackages += 1;
      maxActivePackages = Math.max(maxActivePackages, activePackages);
      try {
        const zip = await originalLoadAsync(buffer);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return zip;
      } finally {
        activePackages -= 1;
      }
    });

    await listBackupHistory(paths);

    expect(processingOrder).toEqual(["newer", "older"]);
    expect(maxActivePackages).toBe(1);
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

  it.each([
    "/absolute.png",
    "attachments/../escape.png",
    "attachments\\escape.png",
  ])("rejects non-canonical attachment path %s during prepare", async (attachmentPath) => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backupPath = await writeCustomBackup(paths, { attachmentPath });

    await expect(prepareRestoreBackup(paths, backupPath)).rejects.toThrow(
      "Backup manifest contains an invalid attachment path.",
    );
  });

  it("rejects a manifest attachment omitted from manifest.files", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backupPath = await writeCustomBackup(paths, {
      attachmentPath: "attachments/entry.png",
      includeAttachmentInFiles: false,
    });

    await expect(prepareRestoreBackup(paths, backupPath)).rejects.toThrow(
      "Backup attachment is not covered by manifest.files.",
    );
  });

  it("rejects an archive attachment omitted from the manifest", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backupPath = await writeCustomBackup(paths, {
      attachmentPath: "attachments/entry.png",
      extraArchiveAttachmentPath: "attachments/unchecked.png",
    });

    await expect(prepareRestoreBackup(paths, backupPath)).rejects.toThrow(
      "Backup archive contains an undeclared attachment.",
    );
  });

  it("rejects an undeclared archive attachment that uses backslashes", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backupPath = await writeCustomBackup(paths, {
      attachmentPath: "attachments/entry.png",
      extraArchiveAttachmentPath: "attachments\\unchecked.png",
    });

    await expect(prepareRestoreBackup(paths, backupPath)).rejects.toThrow(
      "Backup archive contains an undeclared payload.",
    );
  });

  it("rejects attachment checksum metadata that differs from manifest.files", async () => {
    const paths = createPaths();
    createSeededDatabase(paths);
    const backupPath = await writeCustomBackup(paths, {
      attachmentPath: "attachments/entry.png",
      attachmentManifestSha256: "0".repeat(64),
    });

    await expect(prepareRestoreBackup(paths, backupPath)).rejects.toThrow(
      "Backup attachment metadata does not match manifest.files.",
    );
  });
});
