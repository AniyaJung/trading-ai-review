import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";

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
  ipcMain.handle("database:getStatus", () => getDatabaseStatus(db, paths));
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
