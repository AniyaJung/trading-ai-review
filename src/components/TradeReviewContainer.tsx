import { useEffect } from "react";
import { getAttachmentPanelState } from "../app/attachmentPanel";
import type { AttachmentWorkflow } from "../app/attachmentWorkflow";
import { createPreviewTradeDetail } from "../app/previewTrades";
import {
  canSaveRuleCheckEdit,
  getReviewActionState,
  getReviewPanelState,
} from "../app/reviewPanel";
import type { ReviewWorkflow } from "../app/reviewWorkflow";
import {
  getSelectedTradeDetail,
  getTradeScopedStateValue,
} from "../app/tradeDetailSelection";
import type { TradeWorkflow } from "../app/tradeWorkflow";
import type { RendererRuntime } from "../app/tradeList";
import { ImagePreviewOverlay } from "./ImagePreviewOverlay";
import { TradeReviewPanel } from "./TradeReviewPanel";

type TradeReviewTradeWorkflow = {
  state: Pick<
    TradeWorkflow["state"],
    | "selectedTradeId"
    | "selectedTradeDetailState"
    | "loadingTradeDetailId"
    | "tradeDetailErrorState"
    | "isDeletingTrade"
  >;
  actions: Pick<
    TradeWorkflow["actions"],
    "loadTradeDetail" | "handleEditSelectedTrade"
  >;
};

type TradeReviewReviewWorkflow = {
  state: ReviewWorkflow["state"];
  actions: Pick<
    ReviewWorkflow["actions"],
    | "loadLatestReviewForTrade"
    | "handleStartRuleCheckEdit"
    | "handleCancelRuleCheckEdit"
    | "setRuleCheckEditDraft"
  >;
};

type TradeReviewAttachmentWorkflow = {
  state: AttachmentWorkflow["state"];
  actions: Pick<
    AttachmentWorkflow["actions"],
    | "setAttachmentDraft"
    | "setActiveAttachmentPreviewId"
    | "refreshAttachmentsForTrade"
    | "handleChooseAndAttach"
    | "handleDeleteAttachment"
  >;
};

type TradeReviewContainerProps = {
  runtime: RendererRuntime;
  trades: TradeSummary[];
  tradeWorkflow: TradeReviewTradeWorkflow;
  reviewWorkflow: TradeReviewReviewWorkflow;
  attachmentWorkflow: TradeReviewAttachmentWorkflow;
  onDeleteSelectedTrade: (trade: TradeSummary) => void;
  onCreateReviewDraft: (trade: TradeSummary) => void;
  onConfirmReview: (trade: TradeSummary, review: AIReview | undefined) => void;
  onCorrectReview: (trade: TradeSummary, review: AIReview | undefined) => void;
  onInvalidateReview: (trade: TradeSummary, review: AIReview | undefined) => void;
  onSaveRuleCheck: (trade: TradeSummary, checkId: number) => void;
};

export function TradeReviewContainer({
  runtime,
  trades,
  tradeWorkflow,
  reviewWorkflow,
  attachmentWorkflow,
  onDeleteSelectedTrade,
  onCreateReviewDraft,
  onConfirmReview,
  onCorrectReview,
  onInvalidateReview,
  onSaveRuleCheck,
}: TradeReviewContainerProps) {
  const { loadTradeDetail } = tradeWorkflow.actions;
  const { loadLatestReviewForTrade } = reviewWorkflow.actions;
  const { refreshAttachmentsForTrade } = attachmentWorkflow.actions;
  const selectedTrade =
    trades.find(
      (trade) => trade.id === tradeWorkflow.state.selectedTradeId,
    ) ?? trades[0];
  const cachedReview = selectedTrade
    ? reviewWorkflow.state.latestReviewByTradeId[selectedTrade.id]
    : undefined;
  const latestReview =
    selectedTrade?.aiReviewStatus === "invalid" &&
    cachedReview?.status !== "invalid"
      ? undefined
      : cachedReview;
  const reviewPanel = getReviewPanelState(selectedTrade);
  const reviewAction = getReviewActionState({
    trade: selectedTrade,
    latestReview,
    hasDesktopRuntime: runtime === "electron",
    isSavingReview: reviewWorkflow.state.isSavingReview,
  });
  const canSaveRuleCheck = canSaveRuleCheckEdit({
    selectedTrade,
    hasDesktopRuntime: runtime === "electron",
    isSavingRuleCheck: reviewWorkflow.state.savingRuleCheckId != null,
  });
  const previewTradeDetail =
    selectedTrade && runtime !== "electron"
      ? createPreviewTradeDetail(selectedTrade)
      : undefined;
  const selectedTradeDetail = getSelectedTradeDetail({
    previewTradeDetail,
    selectedTrade,
    selectedTradeDetailState: tradeWorkflow.state.selectedTradeDetailState,
  });
  const isLoadingTradeDetail =
    tradeWorkflow.state.loadingTradeDetailId === selectedTrade?.id;
  const tradeDetailError =
    getTradeScopedStateValue({
      selectedTrade,
      state: tradeWorkflow.state.tradeDetailErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const attachmentPanel = getAttachmentPanelState(
    selectedTrade
      ? (attachmentWorkflow.state.attachmentsByTradeId[selectedTrade.id] ?? [])
      : [],
  );
  const isLoadingAttachments =
    attachmentWorkflow.state.loadingAttachmentTradeId === selectedTrade?.id;
  const attachmentError =
    getTradeScopedStateValue({
      selectedTrade,
      state: attachmentWorkflow.state.attachmentErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const isLoadingReview =
    reviewWorkflow.state.loadingReviewTradeId === selectedTrade?.id;
  const reviewError =
    getTradeScopedStateValue({
      selectedTrade,
      state: reviewWorkflow.state.reviewErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const activeAttachmentPreviewId =
    attachmentWorkflow.state.activeAttachmentPreviewId;
  const activeAttachmentPreview =
    activeAttachmentPreviewId == null
      ? undefined
      : attachmentPanel.items.find(
          (attachment) => attachment.id === activeAttachmentPreviewId,
        );
  const activeAttachmentPreviewDataUrl =
    activeAttachmentPreviewId == null
      ? undefined
      : attachmentWorkflow.state.attachmentImageDataUrls[
          activeAttachmentPreviewId
        ];
  const selectedTradeId = selectedTrade?.id;

  useEffect(() => {
    if (selectedTradeId == null || runtime !== "electron") {
      return;
    }

    void loadTradeDetail(selectedTradeId);
    void loadLatestReviewForTrade(selectedTradeId);
    void refreshAttachmentsForTrade(selectedTradeId);
  }, [
    loadLatestReviewForTrade,
    loadTradeDetail,
    refreshAttachmentsForTrade,
    runtime,
    selectedTradeId,
  ]);

  return (
    <>
      <TradeReviewPanel
        reviewPanel={reviewPanel}
        reviewAction={reviewAction}
        latestReview={latestReview}
        selectedTrade={selectedTrade}
        selectedTradeDetail={selectedTradeDetail}
        isLoadingTradeDetail={isLoadingTradeDetail}
        tradeDetailError={tradeDetailError}
        isLoadingReview={isLoadingReview}
        reviewError={reviewError}
        isSavingReview={reviewWorkflow.state.isSavingReview}
        isDeletingTrade={tradeWorkflow.state.isDeletingTrade}
        editingRuleCheckId={reviewWorkflow.state.editingRuleCheckId}
        ruleCheckEditDraft={reviewWorkflow.state.ruleCheckEditDraft}
        canSaveRuleCheck={canSaveRuleCheck}
        savingRuleCheckId={reviewWorkflow.state.savingRuleCheckId}
        attachmentPanel={attachmentPanel}
        attachmentDraft={attachmentWorkflow.state.attachmentDraft}
        isLoadingAttachments={isLoadingAttachments}
        attachmentError={attachmentError}
        isSavingAttachment={attachmentWorkflow.state.isSavingAttachment}
        deletingAttachmentId={attachmentWorkflow.state.deletingAttachmentId}
        attachmentImageDataUrls={
          attachmentWorkflow.state.attachmentImageDataUrls
        }
        onEditSelectedTrade={() =>
          tradeWorkflow.actions.handleEditSelectedTrade(selectedTradeDetail)
        }
        onDeleteSelectedTrade={() => {
          if (selectedTrade) onDeleteSelectedTrade(selectedTrade);
        }}
        onCreateReviewDraft={() => {
          if (selectedTrade) onCreateReviewDraft(selectedTrade);
        }}
        onConfirmReview={() => {
          if (selectedTrade) onConfirmReview(selectedTrade, latestReview);
        }}
        onCorrectReview={() => {
          if (selectedTrade) onCorrectReview(selectedTrade, latestReview);
        }}
        onInvalidateReview={() => {
          if (selectedTrade) onInvalidateReview(selectedTrade, latestReview);
        }}
        onStartRuleCheckEdit={
          reviewWorkflow.actions.handleStartRuleCheckEdit
        }
        onRuleCheckDraftChange={reviewWorkflow.actions.setRuleCheckEditDraft}
        onCancelRuleCheckEdit={reviewWorkflow.actions.handleCancelRuleCheckEdit}
        onSaveRuleCheck={(checkId) => {
          if (selectedTrade) onSaveRuleCheck(selectedTrade, checkId);
        }}
        onAttachmentDraftChange={
          attachmentWorkflow.actions.setAttachmentDraft
        }
        onChooseAndAttach={() =>
          void attachmentWorkflow.actions.handleChooseAndAttach(selectedTrade)
        }
        onDeleteAttachment={(attachmentId) =>
          void attachmentWorkflow.actions.handleDeleteAttachment(
            selectedTrade,
            attachmentId,
          )
        }
        onPreviewAttachment={
          attachmentWorkflow.actions.setActiveAttachmentPreviewId
        }
      />

      {activeAttachmentPreview && activeAttachmentPreviewDataUrl ? (
        <ImagePreviewOverlay
          attachment={activeAttachmentPreview}
          imageDataUrl={activeAttachmentPreviewDataUrl}
          onClose={() =>
            attachmentWorkflow.actions.setActiveAttachmentPreviewId(null)
          }
        />
      ) : null}
    </>
  );
}
