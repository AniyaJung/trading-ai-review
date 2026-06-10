import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  createClosedTrade,
  deleteTrade,
  getTradeDetail,
  listTrades,
  updateClosedTrade,
  type CreateClosedTradeInput,
} from "../services/tradeService.js";

export function createTradeIpcHandlers(db: DatabaseSync) {
  return {
    list: () => listTrades(db),
    get: (id: number) => getTradeDetail(db, id),
    update: (id: number, input: CreateClosedTradeInput) =>
      updateClosedTrade(db, id, input),
    delete: (id: number) => deleteTrade(db, id),
    createClosed: (input: CreateClosedTradeInput) =>
      createClosedTrade(db, input),
  };
}

export function registerTradeIpc(db: DatabaseSync) {
  const handlers = createTradeIpcHandlers(db);

  ipcMain.handle("trades:list", () => handlers.list());
  ipcMain.handle("trades:get", (_event, id: number) => handlers.get(id));
  ipcMain.handle(
    "trades:update",
    (_event, id: number, input: CreateClosedTradeInput) =>
      handlers.update(id, input),
  );
  ipcMain.handle("trades:delete", (_event, id: number) => handlers.delete(id));
  ipcMain.handle("trades:createClosed", (_event, input: CreateClosedTradeInput) =>
    handlers.createClosed(input),
  );
}
