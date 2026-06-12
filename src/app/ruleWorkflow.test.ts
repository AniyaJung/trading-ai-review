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
    expect(state.ruleMessage).toBe("创建入场规则后，交易录入时可以绑定具体版本。");
    expect(state.ruleDraft).toEqual(createRuleDraft());
    expect(state.versionDraft).toEqual(createRuleVersionDraft());
  });

  it("keeps rule validation and runtime errors centralized", () => {
    expect(getRuleRuntimeUnavailableError()).toBe(
      "浏览器预览不会写入规则库；请在 Electron 桌面运行时操作。",
    );
    expect(getRuleValidationErrors({ ...createRuleDraft(), name: "A" })).toEqual([
      "请填写规则名称和版本内容。",
    ]);
    expect(
      getRuleVersionValidationErrors({
        ...createRuleVersionDraft(),
        entryRuleId: "",
        content: "new version",
      }),
    ).toEqual(["请选择要追加版本的规则。"]);
    expect(
      getRuleVersionValidationErrors({
        ...createRuleVersionDraft(),
        entryRuleId: "1",
        content: "",
      }),
    ).toEqual(["请填写新版本内容。"]);
  });
});
