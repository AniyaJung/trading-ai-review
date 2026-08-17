export type ReviewPanelState = {
  badge: string;
  status: string;
  description: string;
  bullets: string[];
  manualReviewStatus: string;
  canGenerate: boolean;
  canConfirm: boolean;
};

export type ReviewActionState = {
  canResolveDraft: boolean;
  confirmLabel: string;
  correctLabel: string;
  invalidateLabel: string;
  disabledReason: string | null;
};

export type RuleCheckEditDraft = {
  result: TradeRuleCheckDetail["result"];
  evidence: string;
  comment: string;
};

export type AIReviewUsageSummary = {
  tokenLabel: string;
  costLabel: string;
};

export type AIReviewScoreSummary = {
  totalLabel: string;
  totalCaption: string;
  dimensions: Array<{ label: string; value: string }>;
};

export function getReviewPanelState(
  trade: TradeSummary | undefined,
): ReviewPanelState {
  if (!trade) {
    return {
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
    };
  }

  switch (trade.aiReviewStatus) {
    case "not_generated":
      return {
        badge: "-",
        status: "未生成复盘",
        description: `${trade.symbol} 交易已保存，可以生成 AI 复盘草稿。`,
        bullets: [
          "当前已保存交易事实和成交明细。",
          "生成草稿后，会同步检查绑定规则和截图证据。",
          "确认前，这笔复盘不会进入统计。",
        ],
        manualReviewStatus: "未开始",
        canGenerate: true,
        canConfirm: false,
      };
    case "draft":
    case "needs_review":
      return {
        badge: "待审",
        status: "待确认",
        description: "AI 草稿已生成，请核对事实和规则判断后再确认。",
        bullets: [
          "请检查盈亏、截图证据和规则 checklist 是否一致。",
          "确认或修正后，这笔交易才会进入统计。",
          "如果草稿不可用，可以标记为无效后重新生成。",
        ],
        manualReviewStatus: "待确认",
        canGenerate: false,
        canConfirm: true,
      };
    case "confirmed":
      return {
        badge: "OK",
        status: "已确认",
        description: "该复盘已确认，会纳入统计分析。",
        bullets: [
          "AI 草稿内容已通过人工核对。",
          "统计面板会使用这笔确认后的复盘。",
          "原始 AI 输出和确认时间会保留，便于追溯。",
        ],
        manualReviewStatus: "已确认",
        canGenerate: false,
        canConfirm: false,
      };
    case "corrected":
      return {
        badge: "修正",
        status: "已修正",
        description: "该复盘已修正，会按修正结果进入统计。",
        bullets: [
          "你已调整 AI 草稿中的事实或判断。",
          "统计面板会使用修正后的结构化结果。",
          "原始输出仍会保留，便于之后回看。",
        ],
        manualReviewStatus: "已修正",
        canGenerate: false,
        canConfirm: false,
      };
    case "invalid":
      return {
        badge: "无效",
        status: "已作废",
        description: "该复盘已作废，不会进入统计分析。",
        bullets: [
          "交易事实仍会保留在本地记录中。",
          "作废复盘不会影响统计结果。",
          "后续可以重新生成草稿，再重新确认。",
        ],
        manualReviewStatus: "已作废",
        canGenerate: false,
        canConfirm: false,
      };
  }
}

export function getReviewActionState({
  trade,
  latestReview,
  hasDesktopRuntime,
  isSavingReview,
}: {
  trade: TradeSummary | undefined;
  latestReview: AIReview | undefined;
  hasDesktopRuntime: boolean;
  isSavingReview: boolean;
}): ReviewActionState {
  const labels = {
    confirmLabel: isSavingReview ? "正在处理" : "确认复盘",
    correctLabel: isSavingReview ? "正在处理" : "修正复盘",
    invalidateLabel: isSavingReview ? "正在处理" : "作废复盘",
  };

  if (!trade) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "请先选择一笔交易。",
    };
  }

  if (!hasDesktopRuntime) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "当前是浏览器预览，请在桌面应用中处理复盘草稿。",
    };
  }

  if (!latestReview || !isDraftReviewStatus(latestReview.status)) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "还没有可确认的复盘草稿。",
    };
  }

  if (isSavingReview) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "复盘草稿正在处理中，请稍候。",
    };
  }

  return {
    ...labels,
    canResolveDraft: true,
    disabledReason: null,
  };
}

function isDraftReviewStatus(status: ReviewStatus) {
  return status === "draft" || status === "needs_review";
}

export function createRuleCheckEditDraft(
  check: TradeRuleCheckDetail,
): RuleCheckEditDraft {
  return {
    result: check.result,
    evidence: check.evidence ?? "",
    comment: check.comment ?? "",
  };
}

export function buildRuleCheckUpdateInput(
  draft: RuleCheckEditDraft,
): UpdateRuleCheckInput {
  return {
    result: draft.result,
    evidence: normalizeOptionalText(draft.evidence),
    comment: normalizeOptionalText(draft.comment),
  };
}

export function canSaveRuleCheckEdit({
  selectedTrade,
  hasDesktopRuntime,
  isSavingRuleCheck,
}: {
  selectedTrade: TradeSummary | undefined;
  hasDesktopRuntime: boolean;
  isSavingRuleCheck: boolean;
}) {
  return Boolean(selectedTrade && hasDesktopRuntime && !isSavingRuleCheck);
}

export function getAIReviewUsageSummary(
  review: AIReview | undefined,
): AIReviewUsageSummary | null {
  if (!review) {
    return null;
  }

  const rawResult = review.rawResult;
  const usage = isRecord(rawResult.usage) ? rawResult.usage : {};
  const totalTokens = numberValue(usage.total_tokens ?? usage.totalTokens);
  const costUsd = numberValue(
    rawResult.costUsd ??
      rawResult.cost_usd ??
      rawResult.estimatedCostUsd ??
      rawResult.estimated_cost_usd,
  );

  if (totalTokens == null && costUsd == null) {
    return null;
  }

  return {
    tokenLabel: totalTokens == null ? "未记录" : `${totalTokens} tokens`,
    costLabel: costUsd == null ? "未估算" : `$${costUsd.toFixed(4)}`,
  };
}

export function getAIReviewScoreSummary(
  review: AIReview | undefined,
): AIReviewScoreSummary | null {
  if (!review) {
    return null;
  }

  if (review.scoreBreakdown) {
    return {
      totalLabel: formatScore(review.scoreTotal),
      totalCaption: "三维加权评分",
      dimensions: [
        {
          label: "规则遵守",
          value: formatScore(review.scoreBreakdown.ruleAdherence),
        },
        {
          label: "证据质量",
          value: formatScore(review.scoreBreakdown.evidenceQuality),
        },
        {
          label: "执行质量",
          value: formatScore(review.scoreBreakdown.executionQuality),
        },
      ],
    };
  }

  const legacyScore = normalizeScore(review.scoreTotal);
  const displayedScore = legacyScore == null ? null : Math.min(legacyScore, 89);

  return {
    totalLabel: formatScore(displayedScore),
    totalCaption:
      legacyScore != null && legacyScore > 89
        ? `旧版评分上限（原始 ${legacyScore}）`
        : "旧版评分（未拆分）",
    dimensions: [],
  };
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeScore(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? null
    : Math.round(Math.min(100, Math.max(0, value)));
}

function formatScore(value: number | null) {
  return value == null ? "-" : String(value);
}
