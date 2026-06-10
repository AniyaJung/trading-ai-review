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
    get: (id: number) => ipcRenderer.invoke("trades:get", id),
    update: (id: number, input: unknown) =>
      ipcRenderer.invoke("trades:update", id, input),
    delete: (id: number) => ipcRenderer.invoke("trades:delete", id),
    createClosed: (input: unknown) =>
      ipcRenderer.invoke("trades:createClosed", input),
  },
  attachments: {
    listByTrade: (tradeId: number) =>
      ipcRenderer.invoke("attachments:listByTrade", tradeId),
    attachExistingFile: (input: unknown) =>
      ipcRenderer.invoke("attachments:attachExistingFile", input),
    chooseAndAttach: (input: unknown) =>
      ipcRenderer.invoke("attachments:chooseAndAttach", input),
    delete: (id: number) => ipcRenderer.invoke("attachments:delete", id),
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
