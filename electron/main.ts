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
import { registerTagIpc } from "./ipc/tagIpc.js";
import { resolveRuntimePaths } from "./runtimePaths.js";
import { registerTradeIpc } from "./ipc/tradeIpc.js";
import { buildMainWindowOptions } from "./windowOptions.js";
import { createBackup } from "./services/backupService.js";

const { electronDistDir, rendererDistDir } = resolveRuntimePaths(
  import.meta.url,
);
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const smokeMode = process.env.AI_TRADING_REVIEW_PACKAGED_SMOKE === "1";

type RendererSmokeResult = {
  rootChildCount: number;
  bodyText: string;
  title: string;
};

async function waitForRenderer(mainWindow: BrowserWindow) {
  return (await mainWindow.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const deadline = Date.now() + 5000;
      const inspect = () => {
        const root = document.getElementById("root");
        const rootChildCount = root?.childElementCount ?? 0;
        if (rootChildCount > 0 || Date.now() >= deadline) {
          resolve({
            rootChildCount,
            bodyText: document.body.innerText.slice(0, 500),
            title: document.title,
          });
          return;
        }
        setTimeout(inspect, 50);
      };
      inspect();
    })
  `)) as RendererSmokeResult;
}

app.setName("AI Trading Review");
applyUserDataPathOverride(app, process.env.AI_TRADING_REVIEW_USER_DATA_DIR);
if (smokeMode) {
  app.disableHardwareAcceleration();
}

async function createMainWindow() {
  const mainWindow = new BrowserWindow(
    buildMainWindowOptions(electronDistDir),
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(rendererDistDir, "index.html"));
  }

  const rendererState = await waitForRenderer(mainWindow);
  if (!smokeMode) {
    mainWindow.show();
  }

  return rendererState;
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
  registerTagIpc(db);
  registerAttachmentIpc(db, appDataPaths.attachmentsDir);
  registerBackupIpc(db, appDataPaths);
  registerSettingsIpc(db, appDataPaths);

  const rendererState = await createMainWindow();

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
        rendererRootChildCount: rendererState.rootChildCount,
        rendererBodyText: rendererState.bodyText,
        rendererTitle: rendererState.title,
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
