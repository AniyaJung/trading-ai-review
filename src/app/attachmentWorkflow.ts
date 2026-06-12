import { useCallback, useState } from "react";
import type {
  AttachmentImageType,
  AttachmentSummary,
} from "./attachmentPanel";

export type AttachmentDraft = {
  imageType: AttachmentImageType;
  caption: string;
};

export type AttachmentWorkflowState = {
  attachmentsByTradeId: Record<number, AttachmentSummary[]>;
  attachmentDraft: AttachmentDraft;
  loadingAttachmentTradeId: number | null;
  attachmentErrorState:
    | {
        tradeId: number;
        error: string;
      }
    | undefined;
  isSavingAttachment: boolean;
  deletingAttachmentId: number | null;
  attachmentImageDataUrls: Record<number, string>;
  activeAttachmentPreviewId: number | null;
};

export function createAttachmentWorkflowInitialState(): AttachmentWorkflowState {
  return {
    attachmentsByTradeId: {},
    attachmentDraft: {
      imageType: "entry",
      caption: "",
    },
    loadingAttachmentTradeId: null,
    attachmentErrorState: undefined,
    isSavingAttachment: false,
    deletingAttachmentId: null,
    attachmentImageDataUrls: {},
    activeAttachmentPreviewId: null,
  };
}

export function getAttachmentRuntimeUnavailableError() {
  return "当前是浏览器预览，无法选择本地文件；请在桌面应用中添加截图。";
}

export function getDeleteAttachmentConfirmationMessage() {
  return "确认删除这张交易截图？本机保存的副本也会一起移除。";
}

export function buildChooseAndAttachInput(
  tradeId: number,
  draft: AttachmentDraft,
  existingAttachmentCount: number,
): ChooseAndAttachInput {
  return {
    tradeId,
    imageType: draft.imageType,
    caption: draft.caption.trim() || null,
    sortOrder: existingAttachmentCount,
  };
}

export async function readAttachmentImageDataUrlEntries(
  attachments: AttachmentSummary[],
  readImageDataUrl: (id: number) => Promise<string>,
) {
  const entries = await Promise.all(
    attachments.map(async (attachment) => {
      try {
        const dataUrl = await readImageDataUrl(attachment.id);
        return dataUrl ? ([attachment.id, dataUrl] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return entries.filter((entry): entry is readonly [number, string] =>
    Boolean(entry),
  );
}

export function useAttachmentWorkflow(
  desktopApi: DesktopApi | undefined,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const [attachmentsByTradeId, setAttachmentsByTradeId] = useState<
    Record<number, AttachmentSummary[]>
  >({});
  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraft>({
    imageType: "entry",
    caption: "",
  });
  const [loadingAttachmentTradeId, setLoadingAttachmentTradeId] = useState<
    number | null
  >(null);
  const [attachmentErrorState, setAttachmentErrorState] = useState<
    | {
        tradeId: number;
        error: string;
      }
    | undefined
  >();
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(
    null,
  );
  const [attachmentImageDataUrls, setAttachmentImageDataUrls] = useState<
    Record<number, string>
  >({});
  const [activeAttachmentPreviewId, setActiveAttachmentPreviewId] = useState<
    number | null
  >(null);

  const loadAttachmentImageDataUrls = useCallback(
    async (attachments: AttachmentSummary[]) => {
      if (!desktopApi || attachments.length === 0) {
        return;
      }

      const entries = await readAttachmentImageDataUrlEntries(
        attachments,
        (id) => desktopApi.attachments.readImageDataUrl(id),
      );
      setAttachmentImageDataUrls((current) => ({
        ...current,
        ...Object.fromEntries(entries),
      }));
    },
    [desktopApi],
  );

  const refreshAttachmentsForTrade = useCallback(
    async (tradeId: number) => {
      if (!desktopApi) {
        return;
      }

      setLoadingAttachmentTradeId(tradeId);
      try {
        const attachments = await desktopApi.attachments.listByTrade(tradeId);
        setAttachmentsByTradeId((current) => ({
          ...current,
          [tradeId]: attachments,
        }));
        await loadAttachmentImageDataUrls(attachments);
        setAttachmentErrorState(undefined);
      } catch (error) {
        setAttachmentErrorState({
          tradeId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoadingAttachmentTradeId((current) =>
          current === tradeId ? null : current,
        );
      }
    },
    [desktopApi, loadAttachmentImageDataUrls],
  );

  const handleChooseAndAttach = async (selectedTrade: TradeSummary | undefined) => {
    if (!selectedTrade) {
      return;
    }

    if (!desktopApi) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: getAttachmentRuntimeUnavailableError(),
      });
      return;
    }

    setIsSavingAttachment(true);
    try {
      const attachment = await desktopApi.attachments.chooseAndAttach(
        buildChooseAndAttachInput(
          selectedTrade.id,
          attachmentDraft,
          attachmentsByTradeId[selectedTrade.id]?.length ?? 0,
        ),
      );
      if (!attachment) {
        return;
      }
      setAttachmentDraft((current) => ({
        ...current,
        caption: "",
      }));
      await refreshAttachmentsForTrade(selectedTrade.id);
    } catch (error) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSavingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (
    selectedTrade: TradeSummary | undefined,
    attachmentId: number,
  ) => {
    if (!selectedTrade) {
      return;
    }

    if (!confirmAction(getDeleteAttachmentConfirmationMessage())) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    try {
      if (desktopApi) {
        await desktopApi.attachments.delete(attachmentId);
        await refreshAttachmentsForTrade(selectedTrade.id);
        setAttachmentImageDataUrls((current) => {
          const next = { ...current };
          delete next[attachmentId];
          return next;
        });
        setActiveAttachmentPreviewId((current) =>
          current === attachmentId ? null : current,
        );
      } else {
        setAttachmentsByTradeId((current) => ({
          ...current,
          [selectedTrade.id]: (current[selectedTrade.id] ?? []).filter(
            (attachment) => attachment.id !== attachmentId,
          ),
        }));
      }
    } catch (error) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const removeTradeAttachments = (tradeId: number) => {
    setAttachmentsByTradeId((current) => {
      const next = { ...current };
      delete next[tradeId];
      return next;
    });
  };

  return {
    state: {
      attachmentsByTradeId,
      attachmentDraft,
      loadingAttachmentTradeId,
      attachmentErrorState,
      isSavingAttachment,
      deletingAttachmentId,
      attachmentImageDataUrls,
      activeAttachmentPreviewId,
    },
    actions: {
      setAttachmentDraft,
      setActiveAttachmentPreviewId,
      setAttachmentErrorState,
      removeTradeAttachments,
      loadAttachmentImageDataUrls,
      refreshAttachmentsForTrade,
      handleChooseAndAttach,
      handleDeleteAttachment,
    },
  };
}
