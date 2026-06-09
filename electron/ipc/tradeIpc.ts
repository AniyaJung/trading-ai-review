import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  createClosedTrade,
  listTrades,
  type CreateClosedTradeInput,
} from "../services/tradeService.js";

export function createTradeIpcHandlers(db: DatabaseSync) {
  return {
    list: () => listTrades(db),
    createClosed: (input: CreateClosedTradeInput) =>
      createClosedTrade(db, input),
  };
}

export function registerTradeIpc(db: DatabaseSync) {
  const handlers = createTradeIpcHandlers(db);

  ipcMain.handle("trades:list", () => handlers.list());
  ipcMain.handle("trades:createClosed", (_event, input: CreateClosedTradeInput) =>
    handlers.createClosed(input),
  );
}
