import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  archiveEntryRule,
  createEntryRule,
  createEntryRuleVersion,
  listActiveEntryRulesWithLatestVersion,
  type CreateEntryRuleInput,
  type CreateEntryRuleVersionInput,
} from "../services/ruleService.js";

export function createRuleIpcHandlers(db: DatabaseSync) {
  return {
    listActive: () => listActiveEntryRulesWithLatestVersion(db),
    create: (input: CreateEntryRuleInput) => createEntryRule(db, input),
    createVersion: (input: CreateEntryRuleVersionInput) =>
      createEntryRuleVersion(db, input),
    archive: (id: number) => archiveEntryRule(db, id),
  };
}

export function registerRuleIpc(db: DatabaseSync) {
  const handlers = createRuleIpcHandlers(db);

  ipcMain.handle("rules:listActive", () => handlers.listActive());
  ipcMain.handle("rules:create", (_event, input: CreateEntryRuleInput) =>
    handlers.create(input),
  );
  ipcMain.handle(
    "rules:createVersion",
    (_event, input: CreateEntryRuleVersionInput) =>
      handlers.createVersion(input),
  );
  ipcMain.handle("rules:archive", (_event, id: number) => handlers.archive(id));
}
