import { describe, expect, it } from "vitest";
import {
  buildRuleCheckUpdateInput,
  canSaveRuleCheckEdit,
  createRuleCheckEditDraft,
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
      description: "保存一笔已平仓交易后，可在这里查看 AI 复盘状态。",
      bullets: [
        "当前没有可复盘的交易记录。",
        "AI 复盘会从交易事实、截图和规则版本生成结构化草稿。",
        "确认或修正后的复盘才会进入统计口径。",
      ],
      canGenerate: false,
      canConfirm: false,
    });
  });

  it("does not imply AI output exists before generation", () => {
    expect(getReviewPanelState(baseTrade)).toMatchObject({
      badge: "-",
      status: "not generated",
      description: "ES 交易已保存，尚未生成 AI 复盘。",
      canGenerate: true,
      canConfirm: false,
    });
  });

  it("marks draft reviews as needing user confirmation", () => {
    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "needs_review" }),
    ).toMatchObject({
      badge: "待审",
      status: "needs review",
      description: "AI 草稿需要用户确认或修正后才能进入统计。",
      canConfirm: true,
    });
  });

  it("shows confirmed and corrected reviews as statistics-ready", () => {
    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "confirmed" }),
    ).toMatchObject({
      badge: "OK",
      status: "confirmed",
      description: "该复盘已确认，可进入统计口径。",
      canConfirm: false,
    });

    expect(
      getReviewPanelState({ ...baseTrade, aiReviewStatus: "corrected" }),
    ).toMatchObject({
      badge: "修正",
      status: "corrected",
      description: "该复盘已由用户修正，可进入统计口径。",
      canConfirm: false,
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
      confirmLabel: "确认草稿",
      correctLabel: "修正草稿",
      invalidateLabel: "标记无效",
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
        disabledReason: "暂无可确认的复盘草稿。",
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
        disabledReason: "请在 Electron 桌面运行时处理复盘草稿。",
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
        confirmLabel: "处理中",
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
