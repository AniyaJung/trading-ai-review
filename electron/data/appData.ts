import type { App } from "electron";
import fs from "node:fs";
import path from "node:path";

export type AppDataPaths = {
  appDataDir: string;
  databasePath: string;
  attachmentsDir: string;
  backupsDir: string;
};

export function resolveAppDataPaths(app: Pick<App, "getPath">): AppDataPaths {
  const appDataDir = app.getPath("userData");

  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

export function ensureAppDataDirectories(paths: AppDataPaths) {
  fs.mkdirSync(paths.appDataDir, { recursive: true });
  fs.mkdirSync(paths.attachmentsDir, { recursive: true });
  fs.mkdirSync(paths.backupsDir, { recursive: true });
}

export function applyUserDataPathOverride(
  app: Pick<App, "setPath">,
  userDataDir: string | undefined,
) {
  const trimmedPath = userDataDir?.trim();

  if (!trimmedPath) {
    return null;
  }

  const resolvedPath = path.resolve(trimmedPath);
  app.setPath("userData", resolvedPath);
  return resolvedPath;
}
