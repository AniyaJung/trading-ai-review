import { app, ipcMain, shell } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import { createSafeStorageSecretCodec } from "../services/secretCodec.js";
import {
  resetLocalData,
  type ResetLocalDataInput,
} from "../services/dataResetService.js";
import {
  getSettingsSummary,
  saveAISettings,
  type AISettingsInput,
  type SettingsServiceOptions,
} from "../services/settingsService.js";

type SettingsIpcOptions = SettingsServiceOptions & {
  appVersion?: string;
  now?: () => Date;
  openPath?: (targetPath: string) => Promise<string>;
  closeDatabase?: () => void;
  afterReset?: () => void;
};

export function createSettingsIpcHandlers(
  db: DatabaseSync,
  paths: AppDataPaths,
  options: SettingsIpcOptions = {},
) {
  return {
    getSummary: () => getSettingsSummary(db, paths, options),
    saveAI: (input: AISettingsInput) => {
      saveAISettings(db, input, options);
      return getSettingsSummary(db, paths, options);
    },
    resetLocalData: async (input: Pick<ResetLocalDataInput, "confirmationText">) => {
      if (input.confirmationText !== "DELETE") {
        throw new Error("Type DELETE to reset local data.");
      }

      options.closeDatabase?.();
      const result = await resetLocalData(paths, {
        confirmationText: input.confirmationText,
        appVersion: options.appVersion ?? "0.0.0",
        now: options.now?.() ?? new Date(),
      });
      options.afterReset?.();
      return result;
    },
    openDataDirectory: () => openPath(paths.appDataDir, options),
    openBackupsDirectory: () => openPath(paths.backupsDir, options),
  };
}

export function registerSettingsIpc(db: DatabaseSync, paths: AppDataPaths) {
  let databaseClosed = false;
  const handlers = createSettingsIpcHandlers(db, paths, {
    appVersion: app.getVersion(),
    secretCodec: createSafeStorageSecretCodec(),
    openPath: (targetPath) => shell.openPath(targetPath),
    closeDatabase: () => {
      if (!databaseClosed) {
        db.close();
        databaseClosed = true;
      }
    },
    afterReset: () => {
      app.relaunch();
      app.exit(0);
    },
  });

  ipcMain.handle("settings:getSummary", () => handlers.getSummary());
  ipcMain.handle("settings:saveAI", (_event, input: AISettingsInput) =>
    handlers.saveAI(input),
  );
  ipcMain.handle(
    "settings:resetLocalData",
    (_event, input: Pick<ResetLocalDataInput, "confirmationText">) =>
      handlers.resetLocalData(input),
  );
  ipcMain.handle("settings:openDataDirectory", () =>
    handlers.openDataDirectory(),
  );
  ipcMain.handle("settings:openBackupsDirectory", () =>
    handlers.openBackupsDirectory(),
  );
}

function openPath(targetPath: string, options: SettingsIpcOptions) {
  return options.openPath?.(targetPath) ?? shell.openPath(targetPath);
}
