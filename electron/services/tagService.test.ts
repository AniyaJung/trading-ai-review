import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "./tradeService";
import {
  assignManualTag,
  createTag,
  deleteTag,
  listTags,
  listTagsForTrade,
  removeTradeTag,
} from "./tagService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-tags-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

function createTrade(db: ReturnType<typeof createTestDb>) {
  return createClosedTrade(db, {
    symbol: "MES",
    direction: "long",
    openedAt: "2026-08-05T01:30:00.000Z",
    closedAt: "2026-08-05T02:00:00.000Z",
    entryPrice: 6300,
    exitPrice: 6302,
    quantity: 1,
    stopLossPrice: 6298,
    feesTotal: 1.2,
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("tagService", () => {
  it("creates categorized tags and rejects empty or duplicate names", () => {
    const db = createTestDb();

    expect(createTag(db, { name: "  顺势突破  ", category: "setup" })).toEqual(
      expect.objectContaining({
        id: 1,
        name: "顺势突破",
        category: "setup",
        tradeCount: 0,
      }),
    );
    expect(() =>
      createTag(db, { name: "顺势突破", category: "setup" }),
    ).toThrow("该分类下已存在同名标签");
    expect(() => createTag(db, { name: "  ", category: "emotion" })).toThrow(
      "标签名称不能为空",
    );

    db.close();
  });

  it("assigns and removes manual tags while exposing assignment sources", () => {
    const db = createTestDb();
    const trade = createTrade(db);
    const tag = createTag(db, { name: "耐心", category: "emotion" });

    expect(
      assignManualTag(db, { tradeId: trade.id, tagId: tag.id }),
    ).toEqual({
      tradeId: trade.id,
      tagId: tag.id,
      name: "耐心",
      category: "emotion",
      source: "manual",
    });
    expect(listTagsForTrade(db, trade.id)).toHaveLength(1);
    expect(listTags(db)[0]).toEqual(
      expect.objectContaining({
        tradeCount: 1,
        aiReviewTradeCount: 0,
        manualTradeCount: 1,
      }),
    );
    expect(removeTradeTag(db, { tradeId: trade.id, tagId: tag.id })).toBe(true);
    expect(removeTradeTag(db, { tradeId: trade.id, tagId: tag.id })).toBe(false);
    expect(listTagsForTrade(db, trade.id)).toEqual([]);

    db.close();
  });

  it("converts an existing AI assignment to manual and cascades global delete", () => {
    const db = createTestDb();
    const trade = createTrade(db);
    const tag = createTag(db, { name: "突破", category: "setup" });
    db.prepare(
      `insert into trade_tag_map (trade_id, tag_id, source)
       values (?, ?, 'ai_review')`,
    ).run(trade.id, tag.id);

    expect(listTagsForTrade(db, trade.id)[0]?.source).toBe("ai_review");
    assignManualTag(db, { tradeId: trade.id, tagId: tag.id });
    expect(listTagsForTrade(db, trade.id)[0]?.source).toBe("manual");
    expect(deleteTag(db, tag.id)).toEqual({
      deleted: true,
      affectedTradeCount: 1,
    });
    expect(listTagsForTrade(db, trade.id)).toEqual([]);
    expect(deleteTag(db, tag.id)).toEqual({
      deleted: false,
      affectedTradeCount: 0,
    });

    db.close();
  });
});
