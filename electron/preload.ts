import { contextBridge, ipcRenderer } from "electron";
import type {
  AISettingsInput,
  AttachExistingFileInput,
  ChooseAndAttachInput,
  CorrectReviewInput,
  CreateTagInput,
  CreateClosedTradeInput,
  CreateEntryRuleInput,
  CreateEntryRuleVersionInput,
  CreateReviewDraftInput,
  DataResetInput,
  DesktopApi,
  RestoreFromHistoryInput,
  StatsOverviewFilters,
  AssignTradeTagInput,
  UpdateRuleCheckInput,
} from "../shared/contracts/desktopApi.js";

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
    update: (id: number, input: CreateClosedTradeInput) =>
      ipcRenderer.invoke("trades:update", id, input),
    delete: (id: number) => ipcRenderer.invoke("trades:delete", id),
    createClosed: (input: CreateClosedTradeInput) =>
      ipcRenderer.invoke("trades:createClosed", input),
  },
  rules: {
    listActive: () => ipcRenderer.invoke("rules:listActive"),
    create: (input: CreateEntryRuleInput) => ipcRenderer.invoke("rules:create", input),
    createVersion: (input: CreateEntryRuleVersionInput) =>
      ipcRenderer.invoke("rules:createVersion", input),
    archive: (id: number) => ipcRenderer.invoke("rules:archive", id),
  },
  reviews: {
    createDraft: (input: CreateReviewDraftInput) =>
      ipcRenderer.invoke("reviews:createDraft", input),
    generateDraft: (tradeId: number) =>
      ipcRenderer.invoke("reviews:generateDraft", tradeId),
    getLatestForTrade: (tradeId: number) =>
      ipcRenderer.invoke("reviews:getLatestForTrade", tradeId),
    confirm: (id: number) => ipcRenderer.invoke("reviews:confirm", id),
    correct: (id: number, input: CorrectReviewInput) =>
      ipcRenderer.invoke("reviews:correct", id, input),
    invalidate: (id: number) => ipcRenderer.invoke("reviews:invalidate", id),
    updateRuleCheck: (id: number, input: UpdateRuleCheckInput) =>
      ipcRenderer.invoke("reviews:updateRuleCheck", id, input),
  },
  stats: {
    getOverview: (filters?: StatsOverviewFilters) =>
      ipcRenderer.invoke("stats:getOverview", filters),
  },
  tags: {
    list: () => ipcRenderer.invoke("tags:list"),
    create: (input: CreateTagInput) => ipcRenderer.invoke("tags:create", input),
    delete: (tagId: number) => ipcRenderer.invoke("tags:delete", tagId),
    listForTrade: (tradeId: number) =>
      ipcRenderer.invoke("tags:listForTrade", tradeId),
    assignManual: (input: AssignTradeTagInput) =>
      ipcRenderer.invoke("tags:assignManual", input),
    removeFromTrade: (input: AssignTradeTagInput) =>
      ipcRenderer.invoke("tags:removeFromTrade", input),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    listHistory: () => ipcRenderer.invoke("backup:listHistory"),
    chooseAndRestore: () => ipcRenderer.invoke("backup:chooseAndRestore"),
    restoreFromHistory: (input: RestoreFromHistoryInput) =>
      ipcRenderer.invoke("backup:restoreFromHistory", input),
    openDataDirectory: () => ipcRenderer.invoke("backup:openDataDirectory"),
    openBackupsDirectory: () => ipcRenderer.invoke("backup:openBackupsDirectory"),
  },
  settings: {
    getSummary: () => ipcRenderer.invoke("settings:getSummary"),
    saveAI: (input: AISettingsInput) => ipcRenderer.invoke("settings:saveAI", input),
    resetLocalData: (input: DataResetInput) =>
      ipcRenderer.invoke("settings:resetLocalData", input),
    openDataDirectory: () => ipcRenderer.invoke("settings:openDataDirectory"),
    openBackupsDirectory: () =>
      ipcRenderer.invoke("settings:openBackupsDirectory"),
  },
  attachments: {
    listByTrade: (tradeId: number) =>
      ipcRenderer.invoke("attachments:listByTrade", tradeId),
    attachExistingFile: (input: AttachExistingFileInput) =>
      ipcRenderer.invoke("attachments:attachExistingFile", input),
    chooseAndAttach: (input: ChooseAndAttachInput) =>
      ipcRenderer.invoke("attachments:chooseAndAttach", input),
    readImageDataUrl: (id: number) =>
      ipcRenderer.invoke("attachments:readImageDataUrl", id),
    delete: (id: number) => ipcRenderer.invoke("attachments:delete", id),
  },
} satisfies DesktopApi;

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
