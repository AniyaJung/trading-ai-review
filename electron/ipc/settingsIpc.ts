import { ipcMain, shell } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import { createSafeStorageSecretCodec } from "../services/secretCodec.js";
import {
  getSettingsSummary,
  saveAISettings,
  type AISettingsInput,
  type SettingsServiceOptions,
} from "../services/settingsService.js";

type SettingsIpcOptions = SettingsServiceOptions & {
  openPath?: (targetPath: string) => Promise<string>;
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
    openDataDirectory: () => openPath(paths.appDataDir, options),
    openBackupsDirectory: () => openPath(paths.backupsDir, options),
  };
}

export function registerSettingsIpc(db: DatabaseSync, paths: AppDataPaths) {
  const handlers = createSettingsIpcHandlers(db, paths, {
    secretCodec: createSafeStorageSecretCodec(),
    openPath: (targetPath) => shell.openPath(targetPath),
  });

  ipcMain.handle("settings:getSummary", () => handlers.getSummary());
  ipcMain.handle("settings:saveAI", (_event, input: AISettingsInput) =>
    handlers.saveAI(input),
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
