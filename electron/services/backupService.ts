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
import {
  readFile as readFileAsync,
  readdir as readdirAsync,
  stat as statAsync,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import type { AppDataPaths } from "../data/appData.js";
import type {
  BackupHistoryItem,
  BackupManifest,
  BackupManifestFile,
  BackupResult,
  RestoreBackupResult,
} from "../../shared/contracts/desktopApi.js";

const backupSchemaVersion = 1;
const databaseFileName = "app.sqlite";

export type BackupServicePaths = AppDataPaths;

export type BackupServiceOptions = {
  now?: Date;
  appVersion?: string;
  filenameSuffix?: string;
};

export type CreateBackupResult = BackupResult;

export type PreparedRestoreBackup = {
  commit: () => Promise<RestoreBackupResult>;
  dispose: () => void;
};

export type {
  BackupHistoryItem,
  BackupManifest,
  BackupManifestFile,
  BackupResult,
  RestoreBackupResult,
} from "../../shared/contracts/desktopApi.js";

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
  const prepared = await prepareRestoreBackup(paths, backupFilePath, options);

  try {
    return await prepared.commit();
  } finally {
    prepared.dispose();
  }
}

export async function prepareRestoreBackup(
  paths: BackupServicePaths,
  backupFilePath: string,
  options: BackupServiceOptions = {},
): Promise<PreparedRestoreBackup> {
  ensureBackupDirectories(paths);

  const zip = await JSZip.loadAsync(readFileSync(backupFilePath));
  const manifest = await readManifest(zip);
  await validateBackupArchive(zip, manifest);

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

      const relativePath = attachment.path.slice("attachments/".length);
      const outputPath = resolveContainedAttachmentPath(
        restoredAttachmentsDir,
        relativePath,
      );
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, await attachmentEntry.async("nodebuffer"));
    }
  } catch (error) {
    rmSync(restoreDir, { recursive: true, force: true });
    throw error;
  }

  let safetyBackup: CreateBackupResult;
  try {
    safetyBackup = await createBackup(paths, {
      ...options,
      filenameSuffix: "before-restore",
    });
  } catch (error) {
    rmSync(restoreDir, { recursive: true, force: true });
    throw error;
  }

  return {
    commit: async () => {
      copyFileSync(restoredDatabasePath, paths.databasePath);
      rmSync(paths.attachmentsDir, { recursive: true, force: true });
      mkdirSync(path.dirname(paths.attachmentsDir), { recursive: true });
      copyDirectory(restoredAttachmentsDir, paths.attachmentsDir);

      return {
        restoredFromFilePath: backupFilePath,
        safetyBackupFilePath: safetyBackup.filePath,
        manifest,
      };
    },
    dispose: () => {
      rmSync(restoreDir, { recursive: true, force: true });
    },
  };
}

export async function listBackupHistory(
  paths: BackupServicePaths,
): Promise<BackupHistoryItem[]> {
  ensureBackupDirectories(paths);

  const entries = await readdirAsync(paths.backupsDir, { withFileTypes: true });
  const files: Array<
    Pick<BackupHistoryItem, "filePath" | "fileName" | "sizeBytes" | "modifiedAt">
  > = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".zip")) {
      continue;
    }
    const filePath = path.join(paths.backupsDir, entry.name);
    const stats = await statAsync(filePath);
    files.push({
      filePath,
      fileName: entry.name,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  }
  files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));

  const history: BackupHistoryItem[] = [];
  for (const file of files) {
    try {
      const zip = await JSZip.loadAsync(await readFileAsync(file.filePath));
      const manifest = await readManifest(zip);
      const isSupported = manifest.backupSchemaVersion === backupSchemaVersion;
      history.push({
        ...file,
        backupSchemaVersion: manifest.backupSchemaVersion,
        appVersion: manifest.appVersion,
        exportedAt: manifest.exportedAt,
        status: isSupported ? "restorable" : "unsupported-version",
        problem: isSupported
          ? null
          : `Backup schema version ${manifest.backupSchemaVersion} is not supported.`,
      });
    } catch (error) {
      history.push({
        ...file,
        backupSchemaVersion: null,
        appVersion: null,
        exportedAt: null,
        status: "invalid",
        problem: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return history;
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

  if (!Array.isArray(manifest.attachments) || !Array.isArray(manifest.files)) {
    throw new Error("Backup manifest file lists are invalid.");
  }

  for (const attachment of manifest.attachments) {
    if (!isManifestFile(attachment) || !isCanonicalAttachmentPath(attachment.path)) {
      throw new Error("Backup manifest contains an invalid attachment path.");
    }
  }

  const filesByPath = new Map<string, BackupManifestFile>();
  for (const file of manifest.files) {
    if (!isManifestFile(file) || filesByPath.has(file.path)) {
      throw new Error("Backup manifest.files contains an invalid or duplicate entry.");
    }
    filesByPath.set(file.path, file);
  }

  const databaseManifestFile = filesByPath.get(databaseFileName);
  if (!databaseManifestFile) {
    throw new Error("Backup database is not covered by manifest.files.");
  }

  const attachmentPaths = new Set<string>();
  for (const attachment of manifest.attachments) {
    if (attachmentPaths.has(attachment.path)) {
      throw new Error("Backup manifest contains a duplicate attachment.");
    }
    attachmentPaths.add(attachment.path);

    const manifestFile = filesByPath.get(attachment.path);
    if (!manifestFile) {
      throw new Error("Backup attachment is not covered by manifest.files.");
    }
    if (
      manifestFile.sha256 !== attachment.sha256 ||
      manifestFile.bytes !== attachment.bytes
    ) {
      throw new Error("Backup attachment metadata does not match manifest.files.");
    }
  }

  if (
    manifest.files.length !== manifest.attachments.length + 1 ||
    [...filesByPath.keys()].some(
      (filePath) => filePath !== databaseFileName && !attachmentPaths.has(filePath),
    )
  ) {
    throw new Error("Backup manifest.files does not match the declared payload.");
  }

  const allowedPayloadPaths = new Set([
    "manifest.json",
    databaseFileName,
    ...attachmentPaths,
  ]);
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }
    if (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) {
      throw new Error("Backup archive contains an unsafe payload path.");
    }
    if (!allowedPayloadPaths.has(entry.name)) {
      if (entry.name.startsWith("attachments/")) {
        throw new Error("Backup archive contains an undeclared attachment.");
      }
      throw new Error("Backup archive contains an undeclared payload.");
    }
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
    if (buffer.byteLength !== file.bytes) {
      throw new Error(`Backup archive size mismatch for ${file.path}.`);
    }
  }
}

function isManifestFile(value: unknown): value is BackupManifestFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const file = value as Partial<BackupManifestFile>;
  return (
    typeof file.path === "string" &&
    typeof file.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(file.sha256) &&
    typeof file.bytes === "number" &&
    Number.isSafeInteger(file.bytes) &&
    file.bytes >= 0
  );
}

function isCanonicalAttachmentPath(archivePath: string) {
  if (
    archivePath.includes("\\") ||
    path.posix.isAbsolute(archivePath) ||
    !archivePath.startsWith("attachments/") ||
    path.posix.normalize(archivePath) !== archivePath
  ) {
    return false;
  }

  const relativePath = archivePath.slice("attachments/".length);
  return (
    relativePath.length > 0 &&
    relativePath.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function resolveContainedAttachmentPath(rootDir: string, relativePath: string) {
  const resolvedRoot = path.resolve(rootDir);
  const outputPath = path.resolve(resolvedRoot, ...relativePath.split("/"));
  const relativeOutputPath = path.relative(resolvedRoot, outputPath);
  if (
    !relativeOutputPath ||
    relativeOutputPath.startsWith("..") ||
    path.isAbsolute(relativeOutputPath)
  ) {
    throw new Error("Backup attachment path escapes the restore directory.");
  }
  return outputPath;
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
