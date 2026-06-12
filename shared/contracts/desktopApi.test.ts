import { describe, expect, test } from "vitest";
import {
  supportedAttachmentImageTypes,
  type BackupHistoryItem,
  type CreateClosedTradeInput,
  type DesktopApi,
} from "./desktopApi.js";

describe("desktop API shared contracts", () => {
  test("exports runtime-safe attachment image type values", () => {
    expect(supportedAttachmentImageTypes).toEqual([
      "before_entry",
      "entry",
      "holding",
      "exit",
      "review_marked",
    ]);
  });

  test("types desktop API DTOs from one shared module", () => {
    const input = {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-12T01:00:00.000Z",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5400,
      exitPrice: 5404,
      quantity: 1,
      stopLossPrice: 5396,
      feesTotal: 4,
    } satisfies CreateClosedTradeInput;

    const historyItem = {
      filePath: "/tmp/backup.zip",
      fileName: "backup.zip",
      sizeBytes: 1234,
      modifiedAt: "2026-06-12T02:00:00.000Z",
      backupSchemaVersion: 1,
      appVersion: "0.0.0",
      exportedAt: "2026-06-12T01:59:00.000Z",
      status: "restorable",
      problem: null,
    } satisfies BackupHistoryItem;

    const runtime = "electron" satisfies DesktopApi["runtime"];

    expect(input.symbol).toBe("ES");
    expect(historyItem.status).toBe("restorable");
    expect(runtime).toBe("electron");
  });
});
