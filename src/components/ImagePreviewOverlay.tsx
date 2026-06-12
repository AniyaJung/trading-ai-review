import { X } from "lucide-react";

type ImagePreviewOverlayProps = {
  attachment: {
    label: string;
    caption: string;
  };
  imageDataUrl: string;
  onClose: () => void;
};

export function ImagePreviewOverlay({
  attachment,
  imageDataUrl,
  onClose,
}: ImagePreviewOverlayProps) {
  return (
    <div
      className="image-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="交易截图预览"
      onClick={onClose}
    >
      <div
        className="image-preview-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-preview-heading">
          <div>
            <span>{attachment.label}</span>
            <strong>{attachment.caption}</strong>
          </div>
          <button
            type="button"
            className="icon-button"
            title="关闭预览"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <img src={imageDataUrl} alt={`${attachment.label} ${attachment.caption}`} />
      </div>
    </div>
  );
}
