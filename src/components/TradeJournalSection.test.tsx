import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TradeJournalSection } from "./TradeJournalSection";

describe("TradeJournalSection", () => {
  it("renders an editable article and saved metadata", () => {
    const html = renderToStaticMarkup(
      <TradeJournalSection
        draft={{ title: "开盘复盘", content: "按计划执行。" }}
        journal={{
          tradeId: 1,
          title: "开盘复盘",
          content: "按计划执行。",
          createdAt: "2026-06-08T15:20:00.000Z",
          updatedAt: "2026-06-08T15:30:00.000Z",
        }}
        isLoading={false}
        isSaving={false}
        error={null}
        message="复盘文章已保存。"
        onDraftChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(html).toContain("人工复盘文章");
    expect(html).toContain("开盘复盘");
    expect(html).toContain("按计划执行。");
    expect(html).toContain("最近保存");
    expect(html).toContain("保存复盘文章");
  });
});
