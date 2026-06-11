import { ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  confirmReview,
  correctReview,
  createReviewDraft,
  getLatestReviewForTrade,
  invalidateReview,
  updateRuleCheck,
  type CorrectReviewInput,
  type CreateReviewDraftInput,
  type UpdateRuleCheckInput,
} from "../services/reviewService.js";

export function createReviewIpcHandlers(db: DatabaseSync) {
  return {
    createDraft: (input: CreateReviewDraftInput) => createReviewDraft(db, input),
    getLatestForTrade: (tradeId: number) => getLatestReviewForTrade(db, tradeId),
    confirm: (id: number) => confirmReview(db, id),
    correct: (id: number, input: CorrectReviewInput) =>
      correctReview(db, id, input),
    invalidate: (id: number) => invalidateReview(db, id),
    updateRuleCheck: (id: number, input: UpdateRuleCheckInput) =>
      updateRuleCheck(db, id, input),
  };
}

export function registerReviewIpc(db: DatabaseSync) {
  const handlers = createReviewIpcHandlers(db);

  ipcMain.handle("reviews:createDraft", (_event, input: CreateReviewDraftInput) =>
    handlers.createDraft(input),
  );
  ipcMain.handle("reviews:getLatestForTrade", (_event, tradeId: number) =>
    handlers.getLatestForTrade(tradeId),
  );
  ipcMain.handle("reviews:confirm", (_event, id: number) => handlers.confirm(id));
  ipcMain.handle(
    "reviews:correct",
    (_event, id: number, input: CorrectReviewInput) =>
      handlers.correct(id, input),
  );
  ipcMain.handle("reviews:invalidate", (_event, id: number) =>
    handlers.invalidate(id),
  );
  ipcMain.handle(
    "reviews:updateRuleCheck",
    (_event, id: number, input: UpdateRuleCheckInput) =>
      handlers.updateRuleCheck(id, input),
  );
}
