import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TagManagerView } from "./TagManagerView";

describe("TagManagerView", () => {
  it("renders tag creation, filtering, usage, and trade assignment controls", () => {
    const tag: TagDefinition = {
      id: 1,
      name: "顺势突破",
      category: "setup",
      tradeCount: 1,
      aiReviewTradeCount: 1,
      manualTradeCount: 0,
      createdAt: "2026-08-05 12:00:00",
    };
    const html = renderToStaticMarkup(
      <TagManagerView
        runtime="electron"
        tags={[tag]}
        visibleTags={[tag]}
        draft={{ name: "", category: "setup" }}
        searchQuery=""
        categoryFilter="all"
        isLoadingTags={false}
        isMutating={false}
        message=""
        error={null}
        onDraftChange={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onCategoryFilterChange={vi.fn()}
        onCreateTag={vi.fn()}
        onDeleteTag={vi.fn()}
      />,
    );

    expect(html).toContain("新建标签");
    expect(html).toContain("全部分类");
    expect(html).toContain("顺势突破");
    expect(html).toContain("AI 1");
    expect(html).not.toContain("选择交易");
    expect(html).not.toContain("交易标签");
  });
});
