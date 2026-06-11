import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createEntryRule } from "../services/ruleService";
import { createClosedTrade } from "../services/tradeService";
import { createReviewIpcHandlers } from "./reviewIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-review-ipc-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createReviewIpcHandlers", () => {
  it("creates and resolves review states through narrow handlers", () => {
    const db = createTestDb();
    const handlers = createReviewIpcHandlers(db);
    const rule = createEntryRule(db, {
      name: "Opening range pullback",
      content: "Break, retest, enter with defined risk.",
      checklist: ["Break confirmed"],
    });
    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      feesTotal: 5,
      entryRuleVersionId: rule.latestVersion.id,
    });

    expect(handlers.getLatestForTrade(trade.id)).toBeUndefined();

    const draft = handlers.createDraft({
      tradeId: trade.id,
      summary: "Draft summary",
      strengths: ["risk defined"],
      rawResult: { providerId: "review-ipc-1" },
    });

    expect(draft).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        status: "needs_review",
        summary: "Draft summary",
      }),
    );
    expect(handlers.getLatestForTrade(trade.id)).toEqual(draft);
    expect(handlers.confirm(draft.id)).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "confirmed",
      }),
    );
    expect(
      handlers.correct(draft.id, {
        summary: "Corrected summary",
      }),
    ).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "corrected",
        summary: "Corrected summary",
      }),
    );
    expect(handlers.invalidate(draft.id)).toEqual(
      expect.objectContaining({
        id: draft.id,
        status: "invalid",
      }),
    );

    db.close();
  });
});
