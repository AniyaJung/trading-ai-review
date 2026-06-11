import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "../services/tradeService";
import { createAttachmentIpcHandlers } from "./attachmentIpc";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createTestDb() {
  return initializeAppDatabase(path.join(createTempDir("trading-ai-review-attachment-ipc-db-"), "app.sqlite"));
}

function createSourceImage() {
  const sourceFilePath = path.join(
    createTempDir("trading-ai-review-attachment-ipc-source-"),
    "entry.png",
  );
  writeFileSync(sourceFilePath, "fake image bytes");
  return sourceFilePath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createAttachmentIpcHandlers", () => {
  it("lists, attaches, and deletes trade attachments through narrow handlers", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachment-ipc-store-");
    const handlers = createAttachmentIpcHandlers(db, attachmentsDir);
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
    });

    expect(handlers.listByTrade(trade.id)).toEqual([]);

    const attached = handlers.attachExistingFile({
      tradeId: trade.id,
      sourceFilePath: createSourceImage(),
      imageType: "entry",
      caption: "Entry screenshot",
      sortOrder: 1,
    });

    expect(attached).toEqual(
      expect.objectContaining({
        id: 1,
        tradeId: trade.id,
        imageType: "entry",
        caption: "Entry screenshot",
        sortOrder: 1,
      }),
    );
    expect(handlers.listByTrade(trade.id)).toEqual([attached]);
    expect(handlers.readImageDataUrl(attached.id)).toBe(
      "data:image/png;base64,ZmFrZSBpbWFnZSBieXRlcw==",
    );
    expect(handlers.delete(attached.id)).toBe(true);
    expect(handlers.listByTrade(trade.id)).toEqual([]);

    db.close();
  });

  it("chooses an image file and attaches it to a trade", async () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachment-ipc-store-");
    const sourceFilePath = createSourceImage();
    const handlers = createAttachmentIpcHandlers(db, attachmentsDir, {
      chooseImageFile: async () => sourceFilePath,
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
    });

    const attached = await handlers.chooseAndAttach({
      tradeId: trade.id,
      imageType: "entry",
      caption: "Selected entry",
      sortOrder: 0,
    });

    expect(attached).toEqual(
      expect.objectContaining({
        tradeId: trade.id,
        imageType: "entry",
        caption: "Selected entry",
      }),
    );
    expect(handlers.listByTrade(trade.id)).toEqual([attached]);

    db.close();
  });

  it("returns undefined when the image chooser is cancelled", async () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachment-ipc-store-");
    const handlers = createAttachmentIpcHandlers(db, attachmentsDir, {
      chooseImageFile: async () => undefined,
    });

    await expect(
      handlers.chooseAndAttach({
        tradeId: 1,
        imageType: "entry",
        caption: "Cancelled",
      }),
    ).resolves.toBeUndefined();

    db.close();
  });
});
