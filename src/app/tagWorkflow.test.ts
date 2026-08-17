import { describe, expect, it } from "vitest";
import {
  getDeleteTagConfirmationMessage,
  getTagCategoryLabel,
} from "./tagWorkflow";

describe("tagWorkflow helpers", () => {
  it("maps stored categories to user-facing labels", () => {
    expect(getTagCategoryLabel("setup")).toBe("策略");
    expect(getTagCategoryLabel("mistake")).toBe("错误");
    expect(getTagCategoryLabel("emotion")).toBe("情绪");
    expect(getTagCategoryLabel("market")).toBe("市场");
  });

  it("includes affected trade count in destructive confirmation", () => {
    expect(
      getDeleteTagConfirmationMessage({
        id: 4,
        name: "追涨",
        category: "mistake",
        tradeCount: 3,
        aiReviewTradeCount: 2,
        manualTradeCount: 1,
        createdAt: "2026-08-05 12:00:00",
      }),
    ).toContain("将同时从 3 笔交易中移除");
  });
});
