import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import {
  createClosedTrade,
  type CreateClosedTradeInput,
} from "./tradeService";
import {
  attachExistingFile,
  deleteAttachment,
  listAttachmentsByTrade,
  readAttachmentImageDataUrl,
  type AttachExistingFileInput,
} from "./attachmentService";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createTestDb() {
  return initializeAppDatabase(path.join(createTempDir("trading-ai-review-attachments-db-"), "app.sqlite"));
}

function validClosedTradeInput(
  overrides: Partial<CreateClosedTradeInput> = {},
): CreateClosedTradeInput {
  return {
    symbol: "ES",
    direction: "long",
    openedAt: "2026-06-08T14:41:00.000Z",
    closedAt: "2026-06-08T15:20:00.000Z",
    entryPrice: 5300,
    exitPrice: 5304.5,
    quantity: 2,
    stopLossPrice: 5298,
    feesTotal: 5,
    ...overrides,
  };
}

function createSourceImage(filename = "chart.PNG") {
  const sourceDir = createTempDir("trading-ai-review-attachments-source-");
  const sourceFilePath = path.join(sourceDir, filename);
  writeFileSync(sourceFilePath, "fake image bytes");
  return sourceFilePath;
}

function validAttachmentInput(
  tradeId: number,
  sourceFilePath = createSourceImage(),
  overrides: Partial<AttachExistingFileInput> = {},
): AttachExistingFileInput {
  return {
    tradeId,
    sourceFilePath,
    imageType: "entry",
    caption: "Entry chart",
    sortOrder: 10,
    ...overrides,
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

describe("listAttachmentsByTrade", () => {
  it("returns attachments ordered by sort order then id", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());

    const second = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, createSourceImage("second.jpg"), {
        imageType: "exit",
        sortOrder: 20,
      }),
    );
    const first = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, createSourceImage("first.png"), {
        imageType: "before_entry",
        sortOrder: 10,
      }),
    );
    const tie = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, createSourceImage("tie.webp"), {
        imageType: "holding",
        sortOrder: 10,
      }),
    );

    expect(listAttachmentsByTrade(db, trade.id)).toEqual([
      first,
      tie,
      second,
    ]);

    db.close();
  });
});

describe("attachExistingFile", () => {
  it("copies an existing image into the attachments directory and stores metadata", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());
    const sourceFilePath = createSourceImage("setup.PNG");

    const attachment = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, sourceFilePath, {
        imageType: "review_marked",
        caption: "Marked review chart",
        sortOrder: 3,
      }),
    );

    expect(attachment).toEqual({
      id: 1,
      tradeId: trade.id,
      imageType: "review_marked",
      filePath: expect.stringMatching(/\.PNG$/),
      caption: "Marked review chart",
      sortOrder: 3,
      createdAt: expect.any(String),
    });
    expect(path.dirname(attachment.filePath)).toBe(attachmentsDir);
    expect(readFileSync(attachment.filePath, "utf8")).toBe("fake image bytes");
    expect(listAttachmentsByTrade(db, trade.id)).toEqual([attachment]);

    db.close();
  });

  it("avoids stored filename collisions while preserving the original extension", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());
    const sourceFilePath = createSourceImage("duplicate.jpeg");

    const first = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, sourceFilePath),
    );
    const second = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, sourceFilePath),
    );

    expect(first.filePath).not.toBe(second.filePath);
    expect(first.filePath.endsWith(".jpeg")).toBe(true);
    expect(second.filePath.endsWith(".jpeg")).toBe(true);
    expect(existsSync(first.filePath)).toBe(true);
    expect(existsSync(second.filePath)).toBe(true);

    db.close();
  });

  it("rejects unknown trades before copying the source file", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const sourceFilePath = createSourceImage("unknown.png");

    expect(() =>
      attachExistingFile(db, attachmentsDir, validAttachmentInput(999, sourceFilePath)),
    ).toThrow("Trade 999 was not found.");
    expect(listAttachmentsByTrade(db, 999)).toEqual([]);
    expect(
      db.prepare("select count(*) as count from trade_attachment").get(),
    ).toEqual({ count: 0 });
    expect(
      existsSync(path.join(attachmentsDir, path.basename(sourceFilePath))),
    ).toBe(false);

    db.close();
  });

  it("rejects image types not supported by the database", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());

    expect(() =>
      attachExistingFile(
        db,
        attachmentsDir,
        validAttachmentInput(trade.id, createSourceImage("bad.png"), {
          imageType: "after_party" as never,
        }),
      ),
    ).toThrow("Image type after_party is not supported.");
    expect(listAttachmentsByTrade(db, trade.id)).toEqual([]);

    db.close();
  });
});

describe("deleteAttachment", () => {
  it("deletes the attachment row and copied file", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());
    const attachment = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id),
    );

    expect(deleteAttachment(db, attachment.id)).toBe(true);
    expect(existsSync(attachment.filePath)).toBe(false);
    expect(listAttachmentsByTrade(db, trade.id)).toEqual([]);

    db.close();
  });

  it("returns false when deleting an unknown attachment", () => {
    const db = createTestDb();

    expect(deleteAttachment(db, 999)).toBe(false);

    db.close();
  });
});

describe("readAttachmentImageDataUrl", () => {
  it("returns a data URL for a stored attachment image", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());
    const sourceFilePath = createSourceImage("entry.png");
    writeFileSync(sourceFilePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const attachment = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id, sourceFilePath),
    );

    expect(readAttachmentImageDataUrl(db, attachment.id)).toBe(
      "data:image/png;base64,iVBORw==",
    );

    db.close();
  });

  it("rejects unknown attachment ids", () => {
    const db = createTestDb();

    expect(() => readAttachmentImageDataUrl(db, 999)).toThrow(
      "Attachment 999 was not found.",
    );

    db.close();
  });

  it("rejects missing copied files", () => {
    const db = createTestDb();
    const attachmentsDir = createTempDir("trading-ai-review-attachments-store-");
    const trade = createClosedTrade(db, validClosedTradeInput());
    const attachment = attachExistingFile(
      db,
      attachmentsDir,
      validAttachmentInput(trade.id),
    );
    rmSync(attachment.filePath, { force: true });

    expect(() => readAttachmentImageDataUrl(db, attachment.id)).toThrow(
      "Attachment image file was not found.",
    );

    db.close();
  });
});
