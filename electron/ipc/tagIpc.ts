import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import type {
  AssignTradeTagInput,
  CreateTagInput,
} from "../../shared/contracts/tagContracts.js";
import {
  assignManualTag,
  createTag,
  deleteTag,
  listTags,
  listTagsForTrade,
  removeTradeTag,
} from "../services/tagService.js";

export function createTagIpcHandlers(db: DatabaseSync) {
  return {
    list: () => listTags(db),
    create: (input: CreateTagInput) => createTag(db, input),
    delete: (tagId: number) => deleteTag(db, tagId),
    listForTrade: (tradeId: number) => listTagsForTrade(db, tradeId),
    assignManual: (input: AssignTradeTagInput) => assignManualTag(db, input),
    removeFromTrade: (input: AssignTradeTagInput) => removeTradeTag(db, input),
  };
}

export function registerTagIpc(db: DatabaseSync) {
  const handlers = createTagIpcHandlers(db);

  ipcMain.handle("tags:list", () => handlers.list());
  ipcMain.handle("tags:create", (_event, input: CreateTagInput) =>
    handlers.create(input),
  );
  ipcMain.handle("tags:delete", (_event, tagId: number) =>
    handlers.delete(tagId),
  );
  ipcMain.handle("tags:listForTrade", (_event, tradeId: number) =>
    handlers.listForTrade(tradeId),
  );
  ipcMain.handle("tags:assignManual", (_event, input: AssignTradeTagInput) =>
    handlers.assignManual(input),
  );
  ipcMain.handle("tags:removeFromTrade", (_event, input: AssignTradeTagInput) =>
    handlers.removeFromTrade(input),
  );
}
