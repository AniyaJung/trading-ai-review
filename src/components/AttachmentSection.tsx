import { Camera, Trash2 } from "lucide-react";
import {
  attachmentImageTypeOptions,
  type AttachmentImageType,
  type AttachmentPanelItem,
} from "../app/attachmentPanel";

type AttachmentDraft = {
  imageType: AttachmentImageType;
  caption: string;
};

type AttachmentSectionProps = {
  attachmentPanel: {
    countLabel: string;
    emptyText: string | null;
    items: AttachmentPanelItem[];
  };
  attachmentDraft: AttachmentDraft;
  isLoadingAttachments: boolean;
  attachmentError: string | null;
  isSavingAttachment: boolean;
  canAttach: boolean;
  deletingAttachmentId: number | null;
  attachmentImageDataUrls: Record<number, string>;
  onAttachmentDraftChange: (draft: AttachmentDraft) => void;
  onChooseAndAttach: () => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onPreviewAttachment: (attachmentId: number) => void;
};

export function AttachmentSection({
  attachmentPanel,
  attachmentDraft,
  isLoadingAttachments,
  attachmentError,
  isSavingAttachment,
  canAttach,
  deletingAttachmentId,
  attachmentImageDataUrls,
  onAttachmentDraftChange,
  onChooseAndAttach,
  onDeleteAttachment,
  onPreviewAttachment,
}: AttachmentSectionProps) {
  return (
    <div className="attachment-block">
      <div className="detail-heading">
        <strong>交易截图</strong>
        <span>{attachmentPanel.countLabel}</span>
      </div>

      <form
        className="attachment-form"
        onSubmit={(event) => {
          event.preventDefault();
          onChooseAndAttach();
        }}
      >
        <select
          aria-label="截图类型"
          value={attachmentDraft.imageType}
          onChange={(event) =>
            onAttachmentDraftChange({
              ...attachmentDraft,
              imageType: event.currentTarget.value as AttachmentImageType,
            })
          }
        >
          {attachmentImageTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          aria-label="截图备注"
          placeholder="例如：突破前、止损移动后"
          value={attachmentDraft.caption}
          onChange={(event) =>
            onAttachmentDraftChange({
              ...attachmentDraft,
              caption: event.currentTarget.value,
            })
          }
        />
        <button
          type="submit"
          className="secondary-button"
          disabled={isSavingAttachment || !canAttach}
        >
          <Camera aria-hidden="true" size={16} />
          {isSavingAttachment ? "正在添加" : "添加截图"}
        </button>
      </form>

      {isLoadingAttachments ? (
        <div className="detail-state">正在读取这笔交易的截图...</div>
      ) : attachmentError ? (
        <div className="detail-state error">截图操作没有完成：{attachmentError}</div>
      ) : attachmentPanel.items.length === 0 ? (
        <div className="detail-state">{attachmentPanel.emptyText}</div>
      ) : (
        <div className="attachment-list">
          {attachmentPanel.items.map((attachment) => (
            <div key={attachment.id} className="attachment-row">
              <button
                type="button"
                className="attachment-thumb"
                title="查看截图"
                disabled={!attachmentImageDataUrls[attachment.id]}
                onClick={() => onPreviewAttachment(attachment.id)}
              >
                {attachmentImageDataUrls[attachment.id] ? (
                  <img
                    src={attachmentImageDataUrls[attachment.id]}
                    alt={`${attachment.label} ${attachment.caption}`}
                  />
                ) : (
                  <Camera aria-hidden="true" size={18} />
                )}
              </button>
              <div>
                <span>{attachment.label}</span>
                <strong>{attachment.caption}</strong>
                <small>{attachment.fileName}</small>
              </div>
              <button
                type="button"
                className="icon-button danger-icon"
                title="删除截图"
                disabled={deletingAttachmentId === attachment.id}
                onClick={() => onDeleteAttachment(attachment.id)}
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
