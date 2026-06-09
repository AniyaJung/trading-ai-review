import { contextBridge, ipcRenderer } from "electron";

const desktopApi = {
  runtime: "electron" as const,
  platform: process.platform,
  database: {
    getStatus: () => ipcRenderer.invoke("database:getStatus") as Promise<{
      databasePath: string;
      appDataDir: string;
      instrumentCount: number;
      migrationVersion: number;
    }>,
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
