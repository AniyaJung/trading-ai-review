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
    listInstruments: () => ipcRenderer.invoke("database:listInstruments"),
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
  rules: {
    listActive: () => ipcRenderer.invoke("rules:listActive"),
    create: (input: unknown) => ipcRenderer.invoke("rules:create", input),
    createVersion: (input: unknown) =>
      ipcRenderer.invoke("rules:createVersion", input),
    archive: (id: number) => ipcRenderer.invoke("rules:archive", id),
  },
  reviews: {
    createDraft: (input: unknown) =>
      ipcRenderer.invoke("reviews:createDraft", input),
    generateDraft: (tradeId: number) =>
      ipcRenderer.invoke("reviews:generateDraft", tradeId),
    getLatestForTrade: (tradeId: number) =>
      ipcRenderer.invoke("reviews:getLatestForTrade", tradeId),
    confirm: (id: number) => ipcRenderer.invoke("reviews:confirm", id),
    correct: (id: number, input: unknown) =>
      ipcRenderer.invoke("reviews:correct", id, input),
    invalidate: (id: number) => ipcRenderer.invoke("reviews:invalidate", id),
    updateRuleCheck: (id: number, input: unknown) =>
      ipcRenderer.invoke("reviews:updateRuleCheck", id, input),
  },
  stats: {
    getOverview: (filters?: unknown) =>
      ipcRenderer.invoke("stats:getOverview", filters),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    listHistory: () => ipcRenderer.invoke("backup:listHistory"),
    chooseAndRestore: () => ipcRenderer.invoke("backup:chooseAndRestore"),
    restoreFromHistory: (input: unknown) =>
      ipcRenderer.invoke("backup:restoreFromHistory", input),
    openDataDirectory: () => ipcRenderer.invoke("backup:openDataDirectory"),
    openBackupsDirectory: () => ipcRenderer.invoke("backup:openBackupsDirectory"),
  },
  settings: {
    getSummary: () => ipcRenderer.invoke("settings:getSummary"),
    saveAI: (input: unknown) => ipcRenderer.invoke("settings:saveAI", input),
    resetLocalData: (input: unknown) =>
      ipcRenderer.invoke("settings:resetLocalData", input),
    openDataDirectory: () => ipcRenderer.invoke("settings:openDataDirectory"),
    openBackupsDirectory: () =>
      ipcRenderer.invoke("settings:openBackupsDirectory"),
  },
  attachments: {
    listByTrade: (tradeId: number) =>
      ipcRenderer.invoke("attachments:listByTrade", tradeId),
    attachExistingFile: (input: unknown) =>
      ipcRenderer.invoke("attachments:attachExistingFile", input),
    chooseAndAttach: (input: unknown) =>
      ipcRenderer.invoke("attachments:chooseAndAttach", input),
    readImageDataUrl: (id: number) =>
      ipcRenderer.invoke("attachments:readImageDataUrl", id),
    delete: (id: number) => ipcRenderer.invoke("attachments:delete", id),
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
