import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import type { AppDataPaths } from "../data/appData.js";

const backupSchemaVersion = 1;
const databaseFileName = "app.sqlite";

export type BackupServicePaths = AppDataPaths;

export type BackupManifestFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type BackupManifest = {
  backupSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  databaseFile: string;
  attachments: BackupManifestFile[];
  files: BackupManifestFile[];
};

export type BackupServiceOptions = {
  now?: Date;
  appVersion?: string;
  filenameSuffix?: string;
};

export type CreateBackupResult = {
  filePath: string;
  manifest: BackupManifest;
};

export type RestoreBackupResult = {
  restoredFromFilePath: string;
  safetyBackupFilePath: string;
  manifest: BackupManifest;
};

export async function createBackup(
  paths: BackupServicePaths,
  options: BackupServiceOptions = {},
): Promise<CreateBackupResult> {
  ensureBackupDirectories(paths);

  if (!existsSync(paths.databasePath)) {
    throw new Error("SQLite database file does not exist.");
  }

  const exportedAt = (options.now ?? new Date()).toISOString();
  const zip = new JSZip();
  const databaseBuffer = readFileSync(paths.databasePath);
  const files: BackupManifestFile[] = [
    createManifestFile(databaseFileName, databaseBuffer),
  ];
  const attachments: BackupManifestFile[] = [];

  zip.file(databaseFileName, databaseBuffer);

  for (const attachment of collectAttachmentFiles(paths.attachmentsDir)) {
    const archivePath = toArchivePath("attachments", attachment.relativePath);
    const buffer = readFileSync(attachment.absolutePath);
    const manifestFile = createManifestFile(archivePath, buffer);
    attachments.push(manifestFile);
    files.push(manifestFile);
    zip.file(archivePath, buffer);
  }

  const manifest: BackupManifest = {
    backupSchemaVersion,
    appVersion: options.appVersion ?? "0.0.0",
    exportedAt,
    databaseFile: databaseFileName,
    attachments,
    files,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const filePath = path.join(
    paths.backupsDir,
    `${createBackupBaseName(exportedAt)}${options.filenameSuffix ? `-${options.filenameSuffix}` : ""}.zip`,
  );
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  writeFileSync(filePath, zipBuffer);

  return { filePath, manifest };
}

export async function restoreBackup(
  paths: BackupServicePaths,
  backupFilePath: string,
  options: BackupServiceOptions = {},
): Promise<RestoreBackupResult> {
  ensureBackupDirectories(paths);

  const zip = await JSZip.loadAsync(readFileSync(backupFilePath));
  const manifest = await readManifest(zip);
  await validateBackupArchive(zip, manifest);

  const safetyBackup = await createBackup(paths, {
    ...options,
    filenameSuffix: "before-restore",
  });

  const restoreDir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-restore-"));
  const restoredDatabasePath = path.join(restoreDir, databaseFileName);
  const restoredAttachmentsDir = path.join(restoreDir, "attachments");

  try {
    const databaseEntry = zip.file(manifest.databaseFile);
    if (!databaseEntry) {
      throw new Error("Backup archive is missing app.sqlite.");
    }

    writeFileSync(restoredDatabasePath, await databaseEntry.async("nodebuffer"));
    mkdirSync(restoredAttachmentsDir, { recursive: true });

    for (const attachment of manifest.attachments) {
      const attachmentEntry = zip.file(attachment.path);
      if (!attachmentEntry) {
        throw new Error(`Backup archive is missing ${attachment.path}.`);
      }

      const relativePath = path.relative("attachments", attachment.path);
      const outputPath = path.join(restoredAttachmentsDir, relativePath);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, await attachmentEntry.async("nodebuffer"));
    }

    copyFileSync(restoredDatabasePath, paths.databasePath);
    rmSync(paths.attachmentsDir, { recursive: true, force: true });
    mkdirSync(path.dirname(paths.attachmentsDir), { recursive: true });
    copyDirectory(restoredAttachmentsDir, paths.attachmentsDir);
  } finally {
    rmSync(restoreDir, { recursive: true, force: true });
  }

  return {
    restoredFromFilePath: backupFilePath,
    safetyBackupFilePath: safetyBackup.filePath,
    manifest,
  };
}

async function readManifest(zip: JSZip): Promise<BackupManifest> {
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("Backup archive is missing manifest.json.");
  }

  return JSON.parse(await manifestEntry.async("string")) as BackupManifest;
}

async function validateBackupArchive(zip: JSZip, manifest: BackupManifest) {
  if (manifest.backupSchemaVersion !== backupSchemaVersion) {
    throw new Error(
      `Backup schema version ${manifest.backupSchemaVersion} is not supported.`,
    );
  }

  if (manifest.databaseFile !== databaseFileName) {
    throw new Error("Backup manifest points to an unsupported database file.");
  }

  for (const file of manifest.files) {
    const entry = zip.file(file.path);
    if (!entry) {
      throw new Error(`Backup archive is missing ${file.path}.`);
    }

    const buffer = await entry.async("nodebuffer");
    if (sha256(buffer) !== file.sha256) {
      throw new Error(`Backup archive checksum mismatch for ${file.path}.`);
    }
  }
}

function ensureBackupDirectories(paths: BackupServicePaths) {
  mkdirSync(paths.appDataDir, { recursive: true });
  mkdirSync(paths.attachmentsDir, { recursive: true });
  mkdirSync(paths.backupsDir, { recursive: true });
}

function collectAttachmentFiles(attachmentsDir: string) {
  if (!existsSync(attachmentsDir)) {
    return [];
  }

  return collectFiles(attachmentsDir).map((absolutePath) => ({
    absolutePath,
    relativePath: path.relative(attachmentsDir, absolutePath),
  }));
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
  });
}

function copyDirectory(sourceDir: string, targetDir: string) {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function createManifestFile(archivePath: string, buffer: Buffer): BackupManifestFile {
  return {
    path: archivePath,
    sha256: sha256(buffer),
    bytes: buffer.byteLength,
  };
}

function createBackupBaseName(exportedAt: string) {
  return `ai-trading-review-backup-${exportedAt.replace(/[:.]/g, "-")}`;
}

function toArchivePath(...parts: string[]) {
  return parts.join("/").replaceAll(path.sep, "/");
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
