import { describe, expect, it } from "vitest";
import {
  createRuleWorkflowInitialState,
  createRuleDraft,
  createRuleVersionDraft,
  createRuleVersionDraftFromRule,
  getRuleRuntimeUnavailableError,
  getRuleValidationErrors,
  getRuleVersionValidationErrors,
} from "./ruleWorkflow";

describe("ruleWorkflow", () => {
  it("creates initial rule workflow state", () => {
    const state = createRuleWorkflowInitialState();

    expect(state.entryRules).toEqual([]);
    expect(state.workspaceMode).toBe("browse");
    expect(state.selectedRuleId).toBeNull();
    expect(state.isLoadingRules).toBe(false);
    expect(state.isSavingRule).toBe(false);
    expect(state.ruleMessage).toBe("");
    expect(state.ruleDraft).toEqual(createRuleDraft());
    expect(state.versionDraft).toEqual(createRuleVersionDraft());
  });

  it("keeps rule validation and runtime errors centralized", () => {
    expect(getRuleRuntimeUnavailableError()).toBe(
      "当前是浏览器预览，无法写入规则库；请在桌面应用中操作。",
    );
    expect(getRuleValidationErrors({ ...createRuleDraft(), name: "A" })).toEqual([
      "请填写规则名称，并补充这个版本的规则内容。",
    ]);
    expect(
      getRuleVersionValidationErrors({
        ...createRuleVersionDraft(),
        entryRuleId: "",
        content: "new version",
      }),
    ).toEqual(["目标规则不可用，请返回规则库后重新选择。"]);
    expect(
      getRuleVersionValidationErrors({
        ...createRuleVersionDraft(),
        entryRuleId: "1",
        content: "",
      }),
    ).toEqual(["请填写新版本的规则内容。"]);
  });

  it("prepares a new version from the latest immutable version", () => {
    expect(
      createRuleVersionDraftFromRule({
        id: 7,
        name: "MES breakout",
        description: null,
        marketType: "index_futures",
        status: "active",
        createdAt: "2026-08-04T00:00:00.000Z",
        updatedAt: "2026-08-04T00:00:00.000Z",
        latestVersion: {
          id: 11,
          entryRuleId: 7,
          versionNo: 3,
          content: "Trade above EMA20.",
          checklist: ["Above EMA20", "Breakout confirmed"],
          createdAt: "2026-08-04T00:00:00.000Z",
        },
      }),
    ).toEqual({
      entryRuleId: "7",
      content: "Trade above EMA20.",
      checklistText: "Above EMA20\nBreakout confirmed",
    });
  });
});
