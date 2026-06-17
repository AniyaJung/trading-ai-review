import { describe, expect, test } from "vitest";
import {
  supportedAttachmentImageTypes as domainAttachmentImageTypes,
} from "./attachmentContracts.js";
import type { BackupHistoryItem as DomainBackupHistoryItem } from "./backupContracts.js";
import {
  supportedAttachmentImageTypes,
  type BackupHistoryItem,
  type CreateClosedTradeInput,
  type DesktopApi,
} from "./desktopApi.js";
import type { CreateClosedTradeInput as DomainCreateClosedTradeInput } from "./tradeContracts.js";

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

  test("keeps domain contracts aligned with desktop API re-exports", () => {
    const domainInput = {
      symbol: "ES",
      direction: "short",
      openedAt: "2026-06-12T01:00:00.000Z",
      closedAt: "2026-06-12T01:30:00.000Z",
      entryPrice: 5404,
      exitPrice: 5400,
      quantity: 1,
      stopLossPrice: 5408,
      feesTotal: 4,
    } satisfies DomainCreateClosedTradeInput;
    const desktopInput = domainInput satisfies CreateClosedTradeInput;
    const domainHistory = {
      filePath: "/tmp/backup.zip",
      fileName: "backup.zip",
      sizeBytes: 1234,
      modifiedAt: "2026-06-12T02:00:00.000Z",
      backupSchemaVersion: 1,
      appVersion: "0.0.0",
      exportedAt: "2026-06-12T01:59:00.000Z",
      status: "restorable",
      problem: null,
    } satisfies DomainBackupHistoryItem;
    const desktopHistory = domainHistory satisfies BackupHistoryItem;

    expect(domainAttachmentImageTypes).toEqual(supportedAttachmentImageTypes);
    expect(desktopInput.direction).toBe("short");
    expect(desktopHistory.fileName).toBe("backup.zip");
  });
});
