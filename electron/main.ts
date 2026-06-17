import { app, BrowserWindow, safeStorage, shell } from "electron";
import path from "node:path";
import {
  applyUserDataPathOverride,
  ensureAppDataDirectories,
  resolveAppDataPaths,
} from "./data/appData.js";
import { initializeAppDatabase } from "./data/database.js";
import { registerAttachmentIpc } from "./ipc/attachmentIpc.js";
import { registerBackupIpc } from "./ipc/backupIpc.js";
import { registerDatabaseIpc } from "./ipc/databaseIpc.js";
import { registerReviewIpc } from "./ipc/reviewIpc.js";
import { registerRuleIpc } from "./ipc/ruleIpc.js";
import { registerSettingsIpc } from "./ipc/settingsIpc.js";
import { registerStatsIpc } from "./ipc/statsIpc.js";
import { resolveRuntimePaths } from "./runtimePaths.js";
import { registerTradeIpc } from "./ipc/tradeIpc.js";
import { buildMainWindowOptions } from "./windowOptions.js";
import { createBackup } from "./services/backupService.js";

const { electronDistDir, rendererDistDir } = resolveRuntimePaths(
  import.meta.url,
);
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const smokeMode = process.env.AI_TRADING_REVIEW_PACKAGED_SMOKE === "1";

app.setName("AI Trading Review");
applyUserDataPathOverride(app, process.env.AI_TRADING_REVIEW_USER_DATA_DIR);

async function createMainWindow() {
  const mainWindow = new BrowserWindow(
    buildMainWindowOptions(electronDistDir),
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    return;
  }

  await mainWindow.loadFile(path.join(rendererDistDir, "index.html"));
  return mainWindow;
}

app.whenReady().then(async () => {
  const appDataPaths = resolveAppDataPaths(app);
  ensureAppDataDirectories(appDataPaths);
  const db = initializeAppDatabase(appDataPaths.databasePath);
  registerDatabaseIpc(db, appDataPaths);
  registerRuleIpc(db);
  registerTradeIpc(db);
  registerReviewIpc(db);
  registerStatsIpc(db);
  registerAttachmentIpc(db, appDataPaths.attachmentsDir);
  registerBackupIpc(db, appDataPaths);
  registerSettingsIpc(db, appDataPaths);

  await createMainWindow();

  if (smokeMode) {
    const backup = await createBackup(appDataPaths, { filenameSuffix: "smoke" });
    const status = db
      .prepare("pragma user_version")
      .get() as { user_version: number };
    console.log(
      `AI_TRADING_REVIEW_SMOKE_RESULT ${JSON.stringify({
        appDataDir: appDataPaths.appDataDir,
        databasePath: appDataPaths.databasePath,
        attachmentsDir: appDataPaths.attachmentsDir,
        backupsDir: appDataPaths.backupsDir,
        backupFilePath: backup.filePath,
        migrationVersion: Number(status.user_version),
        safeStorageAvailable: safeStorage.isEncryptionAvailable(),
      })}`,
    );
    db.close();
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
