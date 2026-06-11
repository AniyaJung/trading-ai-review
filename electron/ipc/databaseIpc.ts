import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import { listInstrumentPresets } from "../data/database.js";

export type DatabaseStatus = {
  databasePath: string;
  appDataDir: string;
  instrumentCount: number;
  migrationVersion: number;
};

export function registerDatabaseIpc(
  db: DatabaseSync,
  paths: AppDataPaths,
) {
  const handlers = createDatabaseIpcHandlers(db, paths);

  ipcMain.handle("database:getStatus", () => handlers.getStatus());
  ipcMain.handle("database:listInstruments", () => handlers.listInstruments());
}

export function createDatabaseIpcHandlers(
  db: DatabaseSync,
  paths: AppDataPaths,
) {
  return {
    getStatus: () => getDatabaseStatus(db, paths),
    listInstruments: () => listInstrumentPresets(db),
  };
}

export function getDatabaseStatus(
  db: DatabaseSync,
  paths: AppDataPaths,
): DatabaseStatus {
  const instrumentCountRow = db.prepare("select count(*) as count from instrument").get() as {
    count: number;
  };
  const migrationVersionRow = db.prepare("pragma user_version").get() as {
    user_version: number;
  };

  return {
    databasePath: paths.databasePath,
    appDataDir: paths.appDataDir,
    instrumentCount: Number(instrumentCountRow.count),
    migrationVersion: Number(migrationVersionRow.user_version),
  };
}
