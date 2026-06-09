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
  trades: {
    list: () => ipcRenderer.invoke("trades:list"),
    createClosed: (input: unknown) =>
      ipcRenderer.invoke("trades:createClosed", input),
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
