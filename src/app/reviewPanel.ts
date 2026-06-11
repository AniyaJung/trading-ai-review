export type ReviewPanelState = {
  badge: string;
  status: string;
  description: string;
  bullets: string[];
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

export function getReviewPanelState(
  trade: TradeSummary | undefined,
): ReviewPanelState {
  if (!trade) {
    return {
      badge: "-",
      status: "暂无交易",
      description: "保存一笔已平仓交易后，可在这里查看 AI 复盘状态。",
      bullets: [
        "当前没有可复盘的交易记录。",
        "AI 复盘服务尚未接入，统计不会使用占位内容。",
        "后续将从交易事实、截图和规则版本生成结构化草稿。",
      ],
      canGenerate: false,
      canConfirm: false,
    };
  }

  switch (trade.aiReviewStatus) {
    case "not_generated":
      return {
        badge: "-",
        status: "not generated",
        description: `${trade.symbol} 交易已保存，尚未生成 AI 复盘。`,
        bullets: [
          "当前只保存了交易事实和成交明细。",
          "可以先生成本地复盘草稿，规则 checklist 会进入待确认状态。",
          "未确认复盘不会进入统计分析。",
        ],
        canGenerate: true,
        canConfirm: false,
      };
    case "draft":
    case "needs_review":
      return {
        badge: "待审",
        status: "needs review",
        description: "AI 草稿需要用户确认或修正后才能进入统计。",
        bullets: [
          "复盘草稿存在，但仍需人工核对事实和规则一致性。",
          "确认前不会写入最终统计口径。",
          "后续会支持编辑、修正和标记无效。",
        ],
        canGenerate: false,
        canConfirm: true,
      };
    case "confirmed":
      return {
        badge: "OK",
        status: "confirmed",
        description: "该复盘已确认，可进入统计口径。",
        bullets: [
          "用户已确认 AI 复盘内容。",
          "统计面板后续会使用这类 confirmed 记录。",
          "仍可在详情页保留原始 AI 输出和确认时间。",
        ],
        canGenerate: false,
        canConfirm: false,
      };
    case "corrected":
      return {
        badge: "修正",
        status: "corrected",
        description: "该复盘已由用户修正，可进入统计口径。",
        bullets: [
          "用户已修正 AI 草稿中的事实或判断。",
          "统计面板后续会使用修正后的结构化结果。",
          "原始输出应在详情页保留用于追溯。",
        ],
        canGenerate: false,
        canConfirm: false,
      };
    case "invalid":
      return {
        badge: "无效",
        status: "invalid",
        description: "该复盘已标记无效，不会进入统计口径。",
        bullets: [
          "这笔交易仍保留原始事实记录。",
          "无效复盘不会参与统计分析。",
          "后续可以重新生成或重新确认复盘。",
        ],
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
    confirmLabel: isSavingReview ? "处理中" : "确认草稿",
    correctLabel: isSavingReview ? "处理中" : "修正草稿",
    invalidateLabel: isSavingReview ? "处理中" : "标记无效",
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
      disabledReason: "请在 Electron 桌面运行时处理复盘草稿。",
    };
  }

  if (!latestReview || !isDraftReviewStatus(latestReview.status)) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "暂无可确认的本地复盘草稿。",
    };
  }

  if (isSavingReview) {
    return {
      ...labels,
      canResolveDraft: false,
      disabledReason: "复盘草稿处理中。",
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
