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
        tagWorkflow={{
          state: {
            assignments: [
              {
                tradeId: sampleTrades[0].id,
                tagId: 1,
                name: "顺势突破",
                category: "setup",
                source: "ai_review",
              },
            ],
            availableTags: [],
            selectedTagId: "",
            isLoadingAssignments: false,
            isMutating: false,
            message: "",
            error: null,
          },
          actions: {
            setSelectedTagId: vi.fn(),
            handleAssignTag: vi.fn(),
            handleRemoveTag: vi.fn(),
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
    expect(html).toContain("交易标签");
    expect(html).toContain("顺势突破");
    expect(html).toContain("管理交易标签");
    expect(html).not.toContain("给当前交易添加标签");
    expect(html).not.toContain("从当前交易移除 顺势突破");
    expect(html).not.toContain("选择交易");
  });

  it("hides a cached confirmed review after the trade is invalidated", () => {
    const invalidTrade = { ...sampleTrades[0], aiReviewStatus: "invalid" as const };
    const tradeState = createTradeWorkflowInitialState(
      "browser-preview",
      [invalidTrade],
    );
    const reviewState = createReviewWorkflowInitialState();
    reviewState.latestReviewByTradeId[invalidTrade.id] = {
      id: 10,
      tradeId: invalidTrade.id,
      status: "confirmed",
      model: "test-model",
      promptVersion: "v1",
      ruleVersionSnapshot: null,
      scoreTotal: 80,
      scoreBreakdown: null,
      scoringVersion: null,
      summary: "这是编辑前的旧复盘",
      facts: {},
      missingInfo: [],
      imageObservations: [],
      strengths: [],
      weaknesses: [],
      suggestions: [],
      tags: [],
      confidence: 0.8,
      rawResult: {},
      createdAt: "2026-06-18T00:00:00.000Z",
      confirmedAt: "2026-06-18T00:01:00.000Z",
    };

    const html = renderToStaticMarkup(
      <TradeReviewContainer
        runtime="browser-preview"
        trades={[invalidTrade]}
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
          state: reviewState,
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
        tagWorkflow={{
          state: {
            assignments: [],
            availableTags: [],
            selectedTagId: "",
            isLoadingAssignments: false,
            isMutating: false,
            message: "",
            error: null,
          },
          actions: {
            setSelectedTagId: vi.fn(),
            handleAssignTag: vi.fn(),
            handleRemoveTag: vi.fn(),
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

    expect(html).not.toContain("这是编辑前的旧复盘");
  });
});
