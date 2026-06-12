import { describe, expect, it } from "vitest";
import {
  createReviewWorkflowInitialState,
  getCorrectReviewPromptMessage,
  getInvalidateReviewConfirmationMessage,
} from "./reviewWorkflow";

describe("reviewWorkflow", () => {
  it("creates the initial review workflow state", () => {
    const state = createReviewWorkflowInitialState();

    expect(state.latestReviewByTradeId).toEqual({});
    expect(state.loadingReviewTradeId).toBeNull();
    expect(state.reviewErrorState).toBeUndefined();
    expect(state.isSavingReview).toBe(false);
    expect(state.editingRuleCheckId).toBeNull();
    expect(state.ruleCheckEditDraft).toEqual({
      result: "unknown",
      evidence: "",
      comment: "",
    });
    expect(state.savingRuleCheckId).toBeNull();
  });

  it("keeps review prompts centralized", () => {
    expect(getCorrectReviewPromptMessage()).toBe("请输入修正后的复盘摘要");
    expect(getInvalidateReviewConfirmationMessage()).toBe(
      "确认作废这条复盘草稿？作废后，这笔交易不会进入复盘统计。",
    );
  });
});
