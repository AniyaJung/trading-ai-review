import { describe, expect, it } from "vitest";
import {
  attachmentImageTypeOptions,
  getAttachmentPanelState,
} from "./attachmentPanel";

describe("attachment panel helpers", () => {
  it("exposes the MVP image type labels in database-compatible order", () => {
    expect(attachmentImageTypeOptions).toEqual([
      { value: "before_entry", label: "入场前" },
      { value: "entry", label: "入场时" },
      { value: "holding", label: "持仓中" },
      { value: "exit", label: "出场后" },
      { value: "review_marked", label: "复盘标注图" },
    ]);
  });

  it("shows an honest empty state before attachments are added", () => {
    expect(getAttachmentPanelState([])).toEqual({
      countLabel: "0 张截图",
      emptyText: "尚未添加截图。MVP 接收外部工具标注后的图片。",
      items: [],
    });
  });

  it("maps attachment rows into user-facing labels", () => {
    expect(
      getAttachmentPanelState([
        {
          id: 2,
          tradeId: 1,
          imageType: "entry",
          filePath: "/tmp/entry.png",
          caption: "Breakout retest",
          sortOrder: 1,
          createdAt: "2026-06-08T15:00:00.000Z",
        },
        {
          id: 1,
          tradeId: 1,
          imageType: "before_entry",
          filePath: "/tmp/before.png",
          caption: null,
          sortOrder: 0,
          createdAt: "2026-06-08T14:59:00.000Z",
        },
      ]),
    ).toEqual({
      countLabel: "2 张截图",
      emptyText: null,
      items: [
        {
          id: 2,
          label: "入场时",
          caption: "Breakout retest",
          filePath: "/tmp/entry.png",
          fileName: "entry.png",
        },
        {
          id: 1,
          label: "入场前",
          caption: "未填写备注",
          filePath: "/tmp/before.png",
          fileName: "before.png",
        },
      ],
    });
  });
});
