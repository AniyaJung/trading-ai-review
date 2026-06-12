import { describe, expect, it } from "vitest";
import {
  buildChooseAndAttachInput,
  createAttachmentWorkflowInitialState,
  getAttachmentRuntimeUnavailableError,
  getDeleteAttachmentConfirmationMessage,
  readAttachmentImageDataUrlEntries,
} from "./attachmentWorkflow";

describe("attachmentWorkflow", () => {
  it("creates the initial attachment state", () => {
    const state = createAttachmentWorkflowInitialState();

    expect(state.attachmentsByTradeId).toEqual({});
    expect(state.attachmentDraft).toEqual({ imageType: "entry", caption: "" });
    expect(state.attachmentImageDataUrls).toEqual({});
    expect(state.activeAttachmentPreviewId).toBeNull();
  });

  it("keeps attachment browser-preview copy centralized", () => {
    expect(getAttachmentRuntimeUnavailableError()).toBe(
      "浏览器预览不能选择本地文件；请在 Electron 桌面运行时添加截图。",
    );
    expect(getDeleteAttachmentConfirmationMessage()).toBe(
      "删除这张交易截图？本地副本也会移除。",
    );
  });

  it("builds a choose-and-attach input from draft and existing count", () => {
    expect(
      buildChooseAndAttachInput(
        42,
        { imageType: "entry", caption: "  breakout retest  " },
        3,
      ),
    ).toEqual({
      tradeId: 42,
      imageType: "entry",
      caption: "breakout retest",
      sortOrder: 3,
    });

    expect(
      buildChooseAndAttachInput(
        42,
        { imageType: "exit", caption: "   " },
        0,
      ).caption,
    ).toBeNull();
  });

  it("reads data URL entries and skips attachment read failures", async () => {
    const entries = await readAttachmentImageDataUrlEntries(
      [
        {
          id: 1,
          tradeId: 42,
          imageType: "entry",
          filePath: "/tmp/entry.png",
          caption: null,
          sortOrder: 0,
          createdAt: "2026-06-12T01:00:00.000Z",
        },
        {
          id: 2,
          tradeId: 42,
          imageType: "exit",
          filePath: "/tmp/exit.png",
          caption: null,
          sortOrder: 1,
          createdAt: "2026-06-12T01:30:00.000Z",
        },
      ],
      async (id) => {
        if (id === 2) {
          throw new Error("missing");
        }
        return "data:image/png;base64,abc";
      },
    );

    expect(entries).toEqual([[1, "data:image/png;base64,abc"]]);
  });
});
