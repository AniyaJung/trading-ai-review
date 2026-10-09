import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type { SaveTradeResearchInput } from "../../shared/contracts/researchContracts.js";
import { getTradeResearch, listResearchSamples, saveTradeResearch } from "../services/researchService.js";

export function createResearchIpcHandlers(db: DatabaseSync) {
  return {
    getForTrade: (tradeId: number) => getTradeResearch(db, tradeId),
    saveForTrade: (input: SaveTradeResearchInput) => saveTradeResearch(db, input),
    listSamples: () => listResearchSamples(db),
  };
}

export function registerResearchIpc(db: DatabaseSync) {
  const handlers = createResearchIpcHandlers(db);
  ipcMain.handle("research:getForTrade", (_event, tradeId: number) => handlers.getForTrade(tradeId));
  ipcMain.handle("research:saveForTrade", (_event, input: SaveTradeResearchInput) => handlers.saveForTrade(input));
  ipcMain.handle("research:listSamples", () => handlers.listSamples());
}
