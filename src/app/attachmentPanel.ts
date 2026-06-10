export type AttachmentImageType =
  | "before_entry"
  | "entry"
  | "holding"
  | "exit"
  | "review_marked";

export type AttachmentSummary = {
  id: number;
  tradeId: number;
  imageType: AttachmentImageType;
  filePath: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export type AttachmentPanelItem = {
  id: number;
  label: string;
  caption: string;
  filePath: string;
};

export const attachmentImageTypeOptions: Array<{
  value: AttachmentImageType;
  label: string;
}> = [
  { value: "before_entry", label: "入场前" },
  { value: "entry", label: "入场时" },
  { value: "holding", label: "持仓中" },
  { value: "exit", label: "出场后" },
  { value: "review_marked", label: "复盘标注图" },
];

const imageTypeLabelByValue = new Map(
  attachmentImageTypeOptions.map((option) => [option.value, option.label]),
);

export function getAttachmentPanelState(attachments: AttachmentSummary[]) {
  return {
    countLabel: `${attachments.length} 张截图`,
    emptyText:
      attachments.length === 0
        ? "尚未添加截图。MVP 接收外部工具标注后的图片。"
        : null,
    items: attachments.map((attachment) => ({
      id: attachment.id,
      label: imageTypeLabelByValue.get(attachment.imageType) ?? attachment.imageType,
      caption: attachment.caption || "未填写备注",
      filePath: attachment.filePath,
    })),
  };
}
