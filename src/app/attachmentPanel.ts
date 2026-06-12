import type {
  AttachmentImageType,
  TradeAttachment,
} from "../../shared/contracts/desktopApi";

export type { AttachmentImageType } from "../../shared/contracts/desktopApi";

export type AttachmentSummary = TradeAttachment;

export type AttachmentPanelItem = {
  id: number;
  label: string;
  caption: string;
  filePath: string;
  fileName: string;
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
        ? "还没有截图。可以添加入场、持仓或出场后的关键画面，帮助 AI 复盘判断。"
        : null,
    items: attachments.map((attachment) => ({
      id: attachment.id,
      label: imageTypeLabelByValue.get(attachment.imageType) ?? attachment.imageType,
      caption: attachment.caption || "未添加备注",
      filePath: attachment.filePath,
      fileName: getFileName(attachment.filePath),
    })),
  };
}

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() || filePath;
}
