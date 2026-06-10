import type { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type AttachmentImageType =
  | "before_entry"
  | "entry"
  | "holding"
  | "exit"
  | "review_marked";

export type TradeAttachment = {
  id: number;
  tradeId: number;
  imageType: AttachmentImageType;
  filePath: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export type AttachExistingFileInput = {
  tradeId: number;
  sourceFilePath: string;
  imageType: AttachmentImageType;
  caption?: string | null;
  sortOrder?: number;
};

const supportedImageTypes: AttachmentImageType[] = [
  "before_entry",
  "entry",
  "holding",
  "exit",
  "review_marked",
];

export function listAttachmentsByTrade(
  db: DatabaseSync,
  tradeId: number,
): TradeAttachment[] {
  return db
    .prepare(
      `select
        id,
        trade_id as tradeId,
        image_type as imageType,
        file_path as filePath,
        caption,
        sort_order as sortOrder,
        created_at as createdAt
      from trade_attachment
      where trade_id = ?
      order by sort_order asc, id asc`,
    )
    .all(tradeId) as unknown as TradeAttachment[];
}

export function attachExistingFile(
  db: DatabaseSync,
  attachmentsDir: string,
  input: AttachExistingFileInput,
): TradeAttachment {
  validateImageType(input.imageType);
  validateSortOrder(input.sortOrder ?? 0);
  assertTradeExists(db, input.tradeId);

  fs.mkdirSync(attachmentsDir, { recursive: true });
  const destinationPath = createAttachmentDestinationPath(
    attachmentsDir,
    input.sourceFilePath,
  );
  fs.copyFileSync(input.sourceFilePath, destinationPath);

  try {
    const result = db
      .prepare(
        `insert into trade_attachment (
          trade_id,
          image_type,
          file_path,
          caption,
          sort_order
        ) values (?, ?, ?, ?, ?)`,
      )
      .run(
        input.tradeId,
        input.imageType,
        destinationPath,
        input.caption ?? null,
        input.sortOrder ?? 0,
      );

    const attachment = getAttachmentById(db, Number(result.lastInsertRowid));

    if (!attachment) {
      throw new Error("Attachment was not found after insert.");
    }

    return attachment;
  } catch (error) {
    if (fs.existsSync(destinationPath)) {
      fs.rmSync(destinationPath, { force: true });
    }
    throw error;
  }
}

export function deleteAttachment(db: DatabaseSync, id: number): boolean {
  const attachment = getAttachmentById(db, id);

  if (!attachment) {
    return false;
  }

  db.prepare("delete from trade_attachment where id = ?").run(id);

  if (fs.existsSync(attachment.filePath)) {
    fs.rmSync(attachment.filePath, { force: true });
  }

  return true;
}

function validateImageType(imageType: AttachmentImageType) {
  if (!supportedImageTypes.includes(imageType)) {
    throw new Error(`Image type ${imageType} is not supported.`);
  }
}

function validateSortOrder(sortOrder: number) {
  if (!Number.isInteger(sortOrder)) {
    throw new Error("Sort order must be a whole number.");
  }
}

function assertTradeExists(db: DatabaseSync, tradeId: number) {
  const row = db.prepare("select id from trade where id = ?").get(tradeId);

  if (!row) {
    throw new Error(`Trade ${tradeId} was not found.`);
  }
}

function createAttachmentDestinationPath(
  attachmentsDir: string,
  sourceFilePath: string,
) {
  const extension = path.extname(sourceFilePath);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const destinationPath = path.join(attachmentsDir, filename);

    if (!fs.existsSync(destinationPath)) {
      return destinationPath;
    }
  }

  throw new Error("Unable to allocate attachment filename.");
}

function getAttachmentById(
  db: DatabaseSync,
  id: number,
): TradeAttachment | undefined {
  return db
    .prepare(
      `select
        id,
        trade_id as tradeId,
        image_type as imageType,
        file_path as filePath,
        caption,
        sort_order as sortOrder,
        created_at as createdAt
      from trade_attachment
      where id = ?`,
    )
    .get(id) as TradeAttachment | undefined;
}
