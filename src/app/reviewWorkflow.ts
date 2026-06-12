import { useCallback, useState } from "react";
import {
  buildRuleCheckUpdateInput,
  createRuleCheckEditDraft,
  type RuleCheckEditDraft,
} from "./reviewPanel";

export type ReviewWorkflowState = {
  latestReviewByTradeId: Record<number, AIReview | undefined>;
  loadingReviewTradeId: number | null;
  reviewErrorState:
    | {
        tradeId: number;
        error: string;
      }
    | undefined;
  isSavingReview: boolean;
  editingRuleCheckId: number | null;
  ruleCheckEditDraft: RuleCheckEditDraft;
  savingRuleCheckId: number | null;
};

export function createReviewWorkflowInitialState(): ReviewWorkflowState {
  return {
    latestReviewByTradeId: {},
    loadingReviewTradeId: null,
    reviewErrorState: undefined,
    isSavingReview: false,
    editingRuleCheckId: null,
    ruleCheckEditDraft: {
      result: "unknown",
      evidence: "",
      comment: "",
    },
    savingRuleCheckId: null,
  };
}

export function getCorrectReviewPromptMessage() {
  return "请输入修正后的复盘摘要";
}

export function getInvalidateReviewConfirmationMessage() {
  return "确认作废这条复盘草稿？作废后，这笔交易不会进入复盘统计。";
}

export function useReviewWorkflow(
  desktopApi: DesktopApi | undefined,
  promptAction: (message: string, defaultValue?: string) => string | null =
    window.prompt,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const [latestReviewByTradeId, setLatestReviewByTradeId] = useState<
    Record<number, AIReview | undefined>
  >({});
  const [loadingReviewTradeId, setLoadingReviewTradeId] = useState<number | null>(
    null,
  );
  const [reviewErrorState, setReviewErrorState] = useState<
    | {
        tradeId: number;
        error: string;
      }
    | undefined
  >();
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [editingRuleCheckId, setEditingRuleCheckId] = useState<number | null>(
    null,
  );
  const [ruleCheckEditDraft, setRuleCheckEditDraft] =
    useState<RuleCheckEditDraft>({
      result: "unknown",
      evidence: "",
      comment: "",
    });
  const [savingRuleCheckId, setSavingRuleCheckId] = useState<number | null>(null);

  const applyReviewMutationState = useCallback(
    (tradeId: number, review: AIReview) => {
      setLatestReviewByTradeId((current) => ({
        ...current,
        [tradeId]: review,
      }));
      setReviewErrorState(undefined);
    },
    [],
  );

  const removeReviewForTrade = useCallback((tradeId: number) => {
    setLatestReviewByTradeId((current) => {
      const next = { ...current };
      delete next[tradeId];
      return next;
    });
  }, []);

  const loadLatestReviewForTrade = useCallback(
    async (tradeId: number) => {
      if (!desktopApi) {
        return;
      }

      setLoadingReviewTradeId(tradeId);
      try {
        const review = await desktopApi.reviews.getLatestForTrade(tradeId);
        setLatestReviewByTradeId((current) => ({
          ...current,
          [tradeId]: review,
        }));
        setReviewErrorState(undefined);
      } catch (error) {
        setReviewErrorState({
          tradeId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoadingReviewTradeId((current) =>
          current === tradeId ? null : current,
        );
      }
    },
    [desktopApi],
  );

  const handleConfirmReview = async (
    selectedTrade: TradeSummary | undefined,
    latestReview: AIReview | undefined,
  ) => {
    if (!selectedTrade || !latestReview || !desktopApi) {
      return undefined;
    }

    setIsSavingReview(true);
    try {
      const review = await desktopApi.reviews.confirm(latestReview.id);
      applyReviewMutationState(selectedTrade.id, review);
      return review;
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleCreateReviewDraft = async (selectedTrade: TradeSummary | undefined) => {
    if (!selectedTrade || !desktopApi) {
      return undefined;
    }

    setIsSavingReview(true);
    try {
      const review = await desktopApi.reviews.generateDraft(selectedTrade.id);
      applyReviewMutationState(selectedTrade.id, review);
      return review;
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleCorrectReview = async (
    selectedTrade: TradeSummary | undefined,
    latestReview: AIReview | undefined,
  ) => {
    if (!selectedTrade || !latestReview || !desktopApi) {
      return undefined;
    }

    const summary = promptAction(
      getCorrectReviewPromptMessage(),
      latestReview.summary ?? "",
    );

    if (summary == null) {
      return undefined;
    }

    setIsSavingReview(true);
    try {
      const review = await desktopApi.reviews.correct(latestReview.id, {
        summary: summary.trim() || latestReview.summary,
      });
      applyReviewMutationState(selectedTrade.id, review);
      return review;
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleInvalidateReview = async (
    selectedTrade: TradeSummary | undefined,
    latestReview: AIReview | undefined,
  ) => {
    if (!selectedTrade || !latestReview || !desktopApi) {
      return undefined;
    }

    if (!confirmAction(getInvalidateReviewConfirmationMessage())) {
      return undefined;
    }

    setIsSavingReview(true);
    try {
      const review = await desktopApi.reviews.invalidate(latestReview.id);
      applyReviewMutationState(selectedTrade.id, review);
      return review;
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleStartRuleCheckEdit = (check: TradeRuleCheckDetail) => {
    setEditingRuleCheckId(check.id);
    setRuleCheckEditDraft(createRuleCheckEditDraft(check));
    setReviewErrorState(undefined);
  };

  const handleCancelRuleCheckEdit = () => {
    setEditingRuleCheckId(null);
    setRuleCheckEditDraft({
      result: "unknown",
      evidence: "",
      comment: "",
    });
  };

  const handleSaveRuleCheck = async (
    selectedTrade: TradeSummary | undefined,
    checkId: number,
  ) => {
    if (!selectedTrade || !desktopApi) {
      return false;
    }

    setSavingRuleCheckId(checkId);
    try {
      await desktopApi.reviews.updateRuleCheck(
        checkId,
        buildRuleCheckUpdateInput(ruleCheckEditDraft),
      );
      setEditingRuleCheckId(null);
      setReviewErrorState(undefined);
      return true;
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setSavingRuleCheckId(null);
    }
  };

  return {
    state: {
      latestReviewByTradeId,
      loadingReviewTradeId,
      reviewErrorState,
      isSavingReview,
      editingRuleCheckId,
      ruleCheckEditDraft,
      savingRuleCheckId,
    },
    actions: {
      setLatestReviewByTradeId,
      setReviewErrorState,
      setRuleCheckEditDraft,
      applyReviewMutationState,
      removeReviewForTrade,
      loadLatestReviewForTrade,
      handleConfirmReview,
      handleCreateReviewDraft,
      handleCorrectReview,
      handleInvalidateReview,
      handleStartRuleCheckEdit,
      handleCancelRuleCheckEdit,
      handleSaveRuleCheck,
    },
  };
}
