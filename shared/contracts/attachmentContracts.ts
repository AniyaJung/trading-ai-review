export const supportedAttachmentImageTypes = [
  "before_entry",
  "entry",
  "holding",
  "exit",
  "review_marked",
] as const;

export type AttachmentImageType = (typeof supportedAttachmentImageTypes)[number];

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

export type ChooseAndAttachInput = Omit<
  AttachExistingFileInput,
  "sourceFilePath"
>;
