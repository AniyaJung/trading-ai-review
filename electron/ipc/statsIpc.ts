import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  getStatsOverview,
  type StatsOverviewFilters,
} from "../services/statsService.js";

export function createStatsIpcHandlers(db: DatabaseSync) {
  return {
    getOverview: (filters?: StatsOverviewFilters) =>
      getStatsOverview(db, filters),
  };
}

export function registerStatsIpc(db: DatabaseSync) {
  const handlers = createStatsIpcHandlers(db);

  ipcMain.handle("stats:getOverview", (_event, filters?: StatsOverviewFilters) =>
    handlers.getOverview(filters),
  );
}
