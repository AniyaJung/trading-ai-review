import { mkdirSync, rmSync } from "node:fs";
import type { AppDataPaths } from "../data/appData.js";
import { initializeAppDatabase } from "../data/database.js";
import { createBackup, type BackupServiceOptions } from "./backupService.js";
import type { DataResetResult } from "../../shared/contracts/desktopApi.js";

export type DataResetServicePaths = AppDataPaths;

export type ResetLocalDataInput = BackupServiceOptions & {
  confirmationText: string;
};

export type ResetLocalDataResult = DataResetResult;

export type { DataResetResult } from "../../shared/contracts/desktopApi.js";

export async function resetLocalData(
  paths: DataResetServicePaths,
  input: ResetLocalDataInput,
): Promise<ResetLocalDataResult> {
  if (input.confirmationText !== "DELETE") {
    throw new Error("Type DELETE to reset local data.");
  }

  const resetAt = (input.now ?? new Date()).toISOString();
  mkdirSync(paths.appDataDir, { recursive: true });
  mkdirSync(paths.attachmentsDir, { recursive: true });
  mkdirSync(paths.backupsDir, { recursive: true });

  const safetyBackup = await createBackup(paths, {
    appVersion: input.appVersion,
    now: input.now,
    filenameSuffix: "before-reset",
  });

  rmSync(paths.databasePath, { force: true });
  rmSync(paths.attachmentsDir, { recursive: true, force: true });
  mkdirSync(paths.attachmentsDir, { recursive: true });
  mkdirSync(paths.backupsDir, { recursive: true });

  const db = initializeAppDatabase(paths.databasePath);
  db.close();

  return {
    safetyBackupFilePath: safetyBackup.filePath,
    resetAt,
    databasePath: paths.databasePath,
    attachmentsDir: paths.attachmentsDir,
  };
}
