import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createAttachmentWorkflowInitialState } from "../app/attachmentWorkflow";
import { sampleTrades } from "../app/previewData";
import { createReviewWorkflowInitialState } from "../app/reviewWorkflow";
import { createTradeWorkflowInitialState } from "../app/tradeWorkflow";
import { TradeReviewContainer } from "./TradeReviewContainer";

describe("TradeReviewContainer", () => {
  it("derives the selected trade and preview detail from workflow state", () => {
    const tradeState = createTradeWorkflowInitialState(
      "browser-preview",
      sampleTrades,
    );
    const html = renderToStaticMarkup(
      <TradeReviewContainer
        runtime="browser-preview"
        trades={sampleTrades}
        tradeWorkflow={{
          state: {
            selectedTradeId: tradeState.selectedTradeId,
            selectedTradeDetailState: tradeState.selectedTradeDetailState,
            loadingTradeDetailId: tradeState.loadingTradeDetailId,
            tradeDetailErrorState: tradeState.tradeDetailErrorState,
            isDeletingTrade: tradeState.isDeletingTrade,
          },
          actions: {
            loadTradeDetail: vi.fn(),
            handleEditSelectedTrade: vi.fn(),
          },
        }}
        reviewWorkflow={{
          state: createReviewWorkflowInitialState(),
          actions: {
            loadLatestReviewForTrade: vi.fn(),
            handleStartRuleCheckEdit: vi.fn(),
            handleCancelRuleCheckEdit: vi.fn(),
            setRuleCheckEditDraft: vi.fn(),
          },
        }}
        attachmentWorkflow={{
          state: createAttachmentWorkflowInitialState(),
          actions: {
            setAttachmentDraft: vi.fn(),
            setActiveAttachmentPreviewId: vi.fn(),
            refreshAttachmentsForTrade: vi.fn(),
            handleChooseAndAttach: vi.fn(),
            handleDeleteAttachment: vi.fn(),
          },
        }}
        onDeleteSelectedTrade={vi.fn()}
        onCreateReviewDraft={vi.fn()}
        onConfirmReview={vi.fn()}
        onCorrectReview={vi.fn()}
        onInvalidateReview={vi.fn()}
        onSaveRuleCheck={vi.fn()}
      />,
    );

    expect(html).toContain("复盘结果");
    expect(html).toContain("ES");
    expect(html).toContain("已读取");
  });
});
