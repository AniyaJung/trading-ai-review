import { describe, expect, it } from "vitest";
import {
  buildRuleCheckUpdateInput,
  canSaveRuleCheckEdit,
  createRuleCheckEditDraft,
  getAIReviewScoreSummary,
  getAIReviewUsageSummary,
  getReviewActionState,
  getReviewPanelState,
} from "./reviewPanel";

const baseTrade: TradeSummary = {
  id: 1,
  symbol: "ES",
  instrumentName: "E-mini S&P 500",
  direction: "long",
  status: "closed",
  openedAt: "2026-06-08T14:41:00.000Z",
  closedAt: "2026-06-08T15:20:00.000Z",
  entryPriceAvg: 5300,
  exitPriceAvg: 5304.5,
  quantity: 2,
  feesTotal: 5,
  grossPnl: 450,
  netPnl: 445,
  riskAmount: 200,
  rMultiple: 2.225,
  entryRuleId: null,
  entryRuleVersionId: null,
  entryRuleName: null,
  entryRuleVersionNo: null,
  aiReviewStatus: "not_generated",
};

describe("review panel state", () => {
  it("shows an honest empty state when no trade is selected", () => {
    expect(getReviewPanelState(undefined)).toEqual({
      badge: "-",
      status: "暂无交易",
      description: "选择或保存一笔已平仓交易后，这里会显示复盘进度。",
      bullets: [
        "先在左侧选择一笔交易，或填写表单新建交易。",
        "AI 复盘会结合交易事实、截图和绑定规则生成草稿。",
        "只有确认或修正后的复盘会进入统计。",
      ],
      manualReviewStatus: "未开始",
      canGenerate: false,
      canConfirm: false,
    });
  });

  it("does not imply AI output exists before generation", () => {
    expect(getReviewPanelState(baseTrade)).toMatchObject({
      badge: "-",
      status: "未生成复盘",
      description: "ES 交易已保存，可以生成 AI 复盘草稿。",
      canGenerate: true,
      canConfirm: false,
      manualReviewStatus: "未开始",
    });
  });

  it("marks draft reviews as needing user confirmation", () => {
    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "needs_review" }),
    ).toMatchObject({
      badge: "待审",
      status: "待确认",
      description: "AI 草稿已生成，请核对事实和规则判断后再确认。",
      canConfirm: true,
      manualReviewStatus: "待确认",
    });
  });

  it("shows confirmed and corrected reviews as statistics-ready", () => {
    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "confirmed" }),
    ).toMatchObject({
      badge: "OK",
      status: "已确认",
      description: "该复盘已确认，会纳入统计分析。",
      canConfirm: false,
      manualReviewStatus: "已确认",
    });

    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "corrected" }),
    ).toMatchObject({
      badge: "修正",
      status: "已修正",
      description: "该复盘已修正，会按修正结果进入统计。",
      canConfirm: false,
      manualReviewStatus: "已修正",
    });

    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "invalid" }),
    ).toMatchObject({
      status: "已作废",
      manualReviewStatus: "已作废",
    });
  });
});

describe("review action state", () => {
  const draftReview: AIReview = {
    id: 10,
    tradeId: 1,
    status: "needs_review",
    model: "gpt-4.1",
    promptVersion: "single-trade-v1",
    ruleVersionSnapshot: null,
    scoreTotal: 82,
    scoreBreakdown: null,
    scoringVersion: null,
    summary: "Draft summary",
    facts: {},
    missingInfo: [],
    imageObservations: [],
    strengths: [],
    weaknesses: [],
    suggestions: [],
    tags: [],
    confidence: 0.7,
    rawResult: {},
    createdAt: "2026-06-08T16:00:00.000Z",
    confirmedAt: null,
  };

  it("enables review resolution only for persisted draft reviews in desktop runtime", () => {
    expect(
      getReviewActionState({
        trade: baseTrade,
        latestReview: draftReview,
        hasDesktopRuntime: true,
        isSavingReview: false,
      }),
    ).toEqual({
      canResolveDraft: true,
      confirmLabel: "确认复盘",
      correctLabel: "修正复盘",
      invalidateLabel: "作废复盘",
      disabledReason: null,
    });
  });

  it("keeps actions disabled without a persisted review draft", () => {
    expect(
      getReviewActionState({
        trade: baseTrade,
        latestReview: undefined,
        hasDesktopRuntime: true,
        isSavingReview: false,
      }),
    ).toEqual(
      expect.objectContaining({
        canResolveDraft: false,
        disabledReason: "还没有可确认的复盘草稿。",
      }),
    );
  });

  it("keeps actions disabled in browser preview and while saving", () => {
    expect(
      getReviewActionState({
        trade: baseTrade,
        latestReview: draftReview,
        hasDesktopRuntime: false,
        isSavingReview: false,
      }),
    ).toEqual(
      expect.objectContaining({
        canResolveDraft: false,
        disabledReason: "当前是浏览器预览，请在桌面应用中处理复盘草稿。",
      }),
    );

    expect(
      getReviewActionState({
        trade: baseTrade,
        latestReview: draftReview,
        hasDesktopRuntime: true,
        isSavingReview: true,
      }),
    ).toEqual(
      expect.objectContaining({
        canResolveDraft: false,
        confirmLabel: "正在处理",
      }),
    );
  });
});

describe("rule check edit state", () => {
  const ruleCheck: TradeRuleCheckDetail = {
    id: 44,
    entryRuleVersionId: 8,
    checkItem: "Break confirmed",
    result: "unknown",
    evidence: null,
    comment: "等待 AI 或人工确认。",
    scoreDelta: null,
    createdAt: "2026-06-08T16:00:00.000Z",
  };

  it("creates an edit draft from the persisted rule check", () => {
    expect(createRuleCheckEditDraft(ruleCheck)).toEqual({
      result: "unknown",
      evidence: "",
      comment: "等待 AI 或人工确认。",
    });
  });

  it("builds a trimmed update input while preserving intentionally blank text", () => {
    expect(
      buildRuleCheckUpdateInput({
        result: "pass",
        evidence: "  screenshot confirms trigger  ",
        comment: "  ",
      }),
    ).toEqual({
      result: "pass",
      evidence: "screenshot confirms trigger",
      comment: null,
    });
  });

  it("only enables saving when desktop runtime is available and no save is running", () => {
    expect(
      canSaveRuleCheckEdit({
        selectedTrade: baseTrade,
        hasDesktopRuntime: true,
        isSavingRuleCheck: false,
      }),
    ).toBe(true);

    expect(
      canSaveRuleCheckEdit({
        selectedTrade: undefined,
        hasDesktopRuntime: true,
        isSavingRuleCheck: false,
      }),
    ).toBe(false);
    expect(
      canSaveRuleCheckEdit({
        selectedTrade: baseTrade,
        hasDesktopRuntime: false,
        isSavingRuleCheck: false,
      }),
    ).toBe(false);
    expect(
      canSaveRuleCheckEdit({
        selectedTrade: baseTrade,
        hasDesktopRuntime: true,
        isSavingRuleCheck: true,
      }),
    ).toBe(false);
  });
});

describe("AI review usage summary", () => {
  const review: AIReview = {
    id: 10,
    tradeId: 1,
    status: "needs_review",
    model: "gpt-4.1",
    promptVersion: "single-trade-v1",
    ruleVersionSnapshot: null,
    scoreTotal: 82,
    scoreBreakdown: null,
    scoringVersion: null,
    summary: "Draft summary",
    facts: {},
    missingInfo: [],
    imageObservations: [],
    strengths: [],
    weaknesses: [],
    suggestions: [],
    tags: [],
    confidence: 0.7,
    rawResult: {},
    createdAt: "2026-06-08T16:00:00.000Z",
    confirmedAt: null,
  };

  it("formats token usage from provider snake_case usage metadata", () => {
    expect(
      getAIReviewUsageSummary({
        ...review,
        rawResult: {
          usage: {
            input_tokens: 100,
            output_tokens: 23,
            total_tokens: 123,
          },
        },
      }),
    ).toEqual({
      tokenLabel: "123 tokens",
      costLabel: "未估算",
    });
  });

  it("formats token usage from camelCase usage metadata and cost values", () => {
    expect(
      getAIReviewUsageSummary({
        ...review,
        rawResult: {
          usage: {
            inputTokens: 100,
            outputTokens: 23,
            totalTokens: 123,
          },
          estimatedCostUsd: 0.0123,
        },
      }),
    ).toEqual({
      tokenLabel: "123 tokens",
      costLabel: "$0.0123",
    });
  });

  it("returns null when no usage or cost metadata exists", () => {
    expect(getAIReviewUsageSummary(review)).toBeNull();
  });
});

describe("AI review score summary", () => {
  const review: AIReview = {
    id: 11,
    tradeId: 1,
    status: "needs_review",
    model: "gpt-test",
    promptVersion: "single-trade-ai-v2",
    ruleVersionSnapshot: null,
    scoreTotal: 80,
    scoreBreakdown: {
      ruleAdherence: 75,
      evidenceQuality: 70,
      executionQuality: 100,
    },
    scoringVersion: "three-dimension-v1",
    summary: "Draft summary",
    facts: {},
    missingInfo: ["entry marker"],
    imageObservations: [],
    strengths: [],
    weaknesses: [],
    suggestions: [],
    tags: [],
    confidence: 0.7,
    rawResult: {},
    createdAt: "2026-06-08T16:00:00.000Z",
    confirmedAt: null,
  };

  it("shows all three dimensions for current reviews", () => {
    expect(getAIReviewScoreSummary(review)).toEqual({
      totalLabel: "80",
      totalCaption: "三维加权评分",
      dimensions: [
        { label: "规则遵守", value: "75" },
        { label: "证据质量", value: "70" },
        { label: "执行质量", value: "100" },
      ],
    });
  });

  it("does not present a legacy single score of 100 as a current perfect score", () => {
    expect(
      getAIReviewScoreSummary({
        ...review,
        scoreTotal: 100,
        scoreBreakdown: null,
        scoringVersion: null,
      }),
    ).toEqual({
      totalLabel: "89",
      totalCaption: "旧版评分上限（原始 100）",
      dimensions: [],
    });
  });
});
