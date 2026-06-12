import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { attachExistingFile } from "./attachmentService";
import { createEntryRule } from "./ruleService";
import { createClosedTrade } from "./tradeService";
import {
  getTradeDetailRow,
  getTradeSummaryById,
  insertClosedTradeExecutions,
  insertClosedTradeRow,
  listAttachmentFileRows,
  listTradeExecutions,
  listTradeRuleChecks,
  listTradeSummaries,
  replaceClosedTradeRow,
  replaceTradeExecutions,
} from "./tradeRepository";

const tempDirs: string[] = [];

function createTestContext() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-repo-"));
  tempDirs.push(dir);
  const db = initializeAppDatabase(path.join(dir, "app.sqlite"));
  return {
    db,
    dir,
    attachmentsDir: path.join(dir, "attachments"),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("tradeRepository", () => {
  it("inserts and updates closed trade rows with entry and exit executions", () => {
    const { db } = createTestContext();

    const tradeId = insertClosedTradeRow(db, {
      instrumentId: 1,
      entryRuleId: null,
      entryRuleVersionId: null,
      direction: "long",
      openedAt: "2026-06-12T01:00:00.000Z",
      userLocalDate: "2026-06-12",
      marketSessionDate: "2026-06-12",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5400,
      exitPrice: 5404,
      quantity: 1,
      stopLossPrice: 5396,
      takeProfitPrice: null,
      feesTotal: 4,
      grossPnl: 200,
      netPnl: 196,
      riskAmount: 200,
      rMultiple: 0.98,
      backgroundNote: null,
      entryReason: "breakout",
      exitReason: "target",
      emotionNote: null,
      lessonNote: null,
    });
    insertClosedTradeExecutions(db, {
      tradeId,
      direction: "long",
      openedAt: "2026-06-12T01:00:00.000Z",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5400,
      exitPrice: 5404,
      quantity: 1,
      feesTotal: 4,
      currency: "USD",
    });

    expect(getTradeSummaryById(db, tradeId)).toEqual(
      expect.objectContaining({
        id: tradeId,
        userLocalDate: "2026-06-12",
        marketSessionDate: "2026-06-12",
        netPnl: 196,
      }),
    );
    expect(listTradeExecutions(db, tradeId).map((item) => item.side)).toEqual([
      "buy",
      "sell",
    ]);

    replaceClosedTradeRow(db, tradeId, {
      instrumentId: 2,
      entryRuleId: null,
      entryRuleVersionId: null,
      direction: "short",
      openedAt: "2026-06-12T02:00:00.000Z",
      userLocalDate: "2026-06-12",
      marketSessionDate: "2026-06-12",
      closedAt: "2026-06-12T02:30:00.000Z",
      entryPrice: 5410,
      exitPrice: 5406,
      quantity: 1,
      stopLossPrice: 5414,
      takeProfitPrice: null,
      feesTotal: 3,
      grossPnl: 20,
      netPnl: 17,
      riskAmount: 20,
      rMultiple: 0.85,
      backgroundNote: null,
      entryReason: null,
      exitReason: null,
      emotionNote: null,
      lessonNote: null,
    });
    replaceTradeExecutions(db, {
      tradeId,
      direction: "short",
      openedAt: "2026-06-12T02:00:00.000Z",
      closedAt: "2026-06-12T02:30:00.000Z",
      entryPrice: 5410,
      exitPrice: 5406,
      quantity: 1,
      feesTotal: 3,
      currency: "USD",
    });

    expect(getTradeSummaryById(db, tradeId)).toEqual(
      expect.objectContaining({ symbol: "MES", netPnl: 17 }),
    );
    expect(listTradeExecutions(db, tradeId).map((item) => item.side)).toEqual([
      "sell",
      "buy",
    ]);

    db.close();
  });

  it("queries trade summaries and detail rows with related executions", () => {
    const { db } = createTestContext();
    const rule = createEntryRule(db, {
      name: "Opening range",
      content: "Breakout with retest.",
      checklist: ["Break confirmed"],
    });
    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-12T01:00:00.000Z",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5400,
      exitPrice: 5404,
      quantity: 1,
      stopLossPrice: 5396,
      feesTotal: 4,
      entryRuleVersionId: rule.latestVersion.id,
    });

    expect(listTradeSummaries(db)).toEqual([
      expect.objectContaining({
        id: trade.id,
        symbol: "ES",
        entryRuleName: "Opening range",
        entryRuleVersionNo: 1,
      }),
    ]);
    expect(getTradeSummaryById(db, trade.id)).toEqual(
      expect.objectContaining({ id: trade.id, netPnl: 196 }),
    );
    expect(getTradeDetailRow(db, trade.id)).toEqual(
      expect.objectContaining({
        id: trade.id,
        entryRuleChecklistJson: JSON.stringify(["Break confirmed"]),
      }),
    );
    expect(listTradeExecutions(db, trade.id).map((item) => item.executionType)).toEqual([
      "entry",
      "exit",
    ]);
    expect(listTradeRuleChecks(db, trade.id)).toEqual([]);

    db.close();
  });

  it("queries attachment file rows for trade deletion cleanup", () => {
    const { db, dir, attachmentsDir } = createTestContext();
    const sourceFilePath = path.join(dir, "source.png");
    writeFileSync(sourceFilePath, "png");
    const trade = createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-12T01:00:00.000Z",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5400,
      exitPrice: 5404,
      quantity: 1,
      stopLossPrice: 5396,
      feesTotal: 4,
    });
    const attachment = attachExistingFile(db, attachmentsDir, {
      tradeId: trade.id,
      sourceFilePath,
      imageType: "entry",
    });

    expect(listAttachmentFileRows(db, trade.id)).toEqual([
      { filePath: attachment.filePath },
    ]);

    db.close();
  });
});
