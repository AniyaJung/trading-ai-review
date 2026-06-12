import { describe, expect, it } from "vitest";
import {
  createRuleWorkflowInitialState,
  createRuleDraft,
  createRuleVersionDraft,
  getRuleRuntimeUnavailableError,
  getRuleValidationErrors,
  getRuleVersionValidationErrors,
} from "./ruleWorkflow";

describe("ruleWorkflow", () => {
  it("creates initial rule workflow state", () => {
    const state = createRuleWorkflowInitialState();

    expect(state.entryRules).toEqual([]);
    expect(state.isLoadingRules).toBe(false);
    expect(state.isSavingRule).toBe(false);
    expect(state.ruleMessage).toBe(
      "先把常用入场规则写成版本，录入交易时就能绑定当时执行的规则。",
    );
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
    ).toEqual(["请先选择要追加新版本的规则。"]);
    expect(
      getRuleVersionValidationErrors({
        ...createRuleVersionDraft(),
        entryRuleId: "1",
        content: "",
      }),
    ).toEqual(["请填写新版本的规则内容。"]);
  });
});
