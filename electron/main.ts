import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAppDataDirectories, resolveAppDataPaths } from "./data/appData.js";
import { initializeAppDatabase } from "./data/database.js";
import { registerDatabaseIpc } from "./ipc/databaseIpc.js";
import { buildMainWindowOptions } from "./windowOptions.js";

const electronDistDir = path.dirname(fileURLToPath(import.meta.url));
const rendererDistDir = path.join(electronDistDir, "../dist");
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

app.setName("AI Trading Review");

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
}

app.whenReady().then(() => {
  const appDataPaths = resolveAppDataPaths(app);
  ensureAppDataDirectories(appDataPaths);
  const db = initializeAppDatabase(appDataPaths.databasePath);
  registerDatabaseIpc(db, appDataPaths);

  void createMainWindow();

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
