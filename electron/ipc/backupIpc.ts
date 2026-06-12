import { app, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import {
  createBackup,
  listBackupHistory,
  restoreBackup,
  type BackupServiceOptions,
} from "../services/backupService.js";

type BackupIpcOptions = {
  appVersion?: string;
  now?: () => Date;
  chooseBackupFile?: () => Promise<string | undefined>;
  openPath?: (targetPath: string) => Promise<string>;
  closeDatabase?: () => void;
  afterRestore?: () => void;
};

type RestoreFromHistoryInput = {
  filePath: string;
};

export function createBackupIpcHandlers(
  paths: AppDataPaths,
  options: BackupIpcOptions = {},
) {
  const getBackupOptions = (): BackupServiceOptions => ({
    appVersion: options.appVersion ?? "0.0.0",
    now: options.now?.() ?? new Date(),
  });

  return {
    create: () => createBackup(paths, getBackupOptions()),
    listHistory: () => listBackupHistory(paths),
    chooseAndRestore: async () => {
      const backupFilePath = await options.chooseBackupFile?.();

      if (!backupFilePath) {
        return undefined;
      }

      options.closeDatabase?.();
      const result = await restoreBackup(paths, backupFilePath, getBackupOptions());
      options.afterRestore?.();
      return result;
    },
    restoreFromHistory: async (input: RestoreFromHistoryInput) => {
      const backupFilePath = requireBackupPathInsideBackupsDir(
        paths.backupsDir,
        input.filePath,
      );
      options.closeDatabase?.();
      const result = await restoreBackup(paths, backupFilePath, getBackupOptions());
      options.afterRestore?.();
      return result;
    },
    openDataDirectory: () => openPath(paths.appDataDir, options),
    openBackupsDirectory: () => openPath(paths.backupsDir, options),
  };
}

export function registerBackupIpc(db: DatabaseSync, paths: AppDataPaths) {
  let databaseClosed = false;
  const handlers = createBackupIpcHandlers(paths, {
    appVersion: app.getVersion(),
    chooseBackupFile: async () => {
      const result = await dialog.showOpenDialog({
        title: "选择备份文件",
        properties: ["openFile"],
        filters: [
          {
            name: "AI Trading Review Backup",
            extensions: ["zip"],
          },
        ],
      });

      return result.canceled ? undefined : result.filePaths[0];
    },
    openPath: (targetPath) => shell.openPath(targetPath),
    closeDatabase: () => {
      if (!databaseClosed) {
        db.close();
        databaseClosed = true;
      }
    },
    afterRestore: () => {
      app.relaunch();
      app.exit(0);
    },
  });

  ipcMain.handle("backup:create", () => handlers.create());
  ipcMain.handle("backup:listHistory", () => handlers.listHistory());
  ipcMain.handle("backup:chooseAndRestore", () => handlers.chooseAndRestore());
  ipcMain.handle(
    "backup:restoreFromHistory",
    (_event, input: RestoreFromHistoryInput) => handlers.restoreFromHistory(input),
  );
  ipcMain.handle("backup:openDataDirectory", () => handlers.openDataDirectory());
  ipcMain.handle("backup:openBackupsDirectory", () =>
    handlers.openBackupsDirectory(),
  );
}

function openPath(targetPath: string, options: BackupIpcOptions) {
  return options.openPath?.(targetPath) ?? shell.openPath(targetPath);
}

function requireBackupPathInsideBackupsDir(backupsDir: string, filePath: string) {
  const resolvedBackupsDir = path.resolve(backupsDir);
  const resolvedFilePath = path.resolve(filePath);
  const relativePath = path.relative(resolvedBackupsDir, resolvedFilePath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    path.extname(resolvedFilePath).toLowerCase() !== ".zip"
  ) {
    throw new Error("Backup file must be inside the managed backups directory.");
  }

  return resolvedFilePath;
}
