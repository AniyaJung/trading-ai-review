import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createRuleVersionDraftFromRule,
  createRuleWorkflowInitialState,
} from "../app/ruleWorkflow";
import { RulesViewContainer } from "./RulesViewContainer";

const rule: EntryRuleWithLatestVersion = {
  id: 7,
  name: "MES 1 分钟 EMA20 顺势突破",
  description: "趋势行情中的顺势突破入场",
  marketType: "index_futures",
  status: "active",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  latestVersion: {
    id: 11,
    entryRuleId: 7,
    versionNo: 3,
    content: "价格站上 EMA20 后顺势突破入场。",
    checklist: ["价格位于 EMA20 上方", "止损位置明确"],
    createdAt: "2026-08-04T00:00:00.000Z",
  },
};

function createWorkflow(
  stateOverrides: Partial<ReturnType<typeof createRuleWorkflowInitialState>> = {},
) {
  return {
    state: {
      ...createRuleWorkflowInitialState(),
      ...stateOverrides,
    },
    actions: {
      setIsLoadingRules: vi.fn(),
      setRuleDraft: vi.fn(),
      setVersionDraft: vi.fn(),
      handleSelectRule: vi.fn(),
      handleStartCreateRule: vi.fn(),
      handleStartRuleVersion: vi.fn(),
      handleCancelRuleEdit: vi.fn(),
      refreshRules: vi.fn(),
      handleCreateRule: vi.fn(),
      handleCreateRuleVersion: vi.fn(),
      handleArchiveRule: vi.fn(),
      applyBootstrapRules: vi.fn(),
      setRuleLoadFailure: vi.fn(),
    },
  };
}

describe("RulesViewContainer", () => {
  it("separates the rule library from the selected rule detail", () => {
    const html = renderToStaticMarkup(
      <RulesViewContainer
        workflow={createWorkflow({
          entryRules: [rule],
          selectedRuleId: rule.id,
        })}
      />,
    );

    expect(html).toContain("规则库");
    expect(html).toContain("当前执行标准");
    expect(html).toContain("入场检查项");
    expect(html).not.toContain("选择要追加版本的规则");
  });

  it("uses domain labels instead of exposing v1 content as a field name", () => {
    const html = renderToStaticMarkup(
      <RulesViewContainer
        workflow={createWorkflow({ workspaceMode: "create" })}
      />,
    );

    expect(html).toContain("新建入场规则");
    expect(html).toContain("规则执行标准");
    expect(html).toContain("入场检查项");
    expect(html).not.toContain("v1 内容");
  });

  it("opens a selected rule version editor without a rule dropdown", () => {
    const html = renderToStaticMarkup(
      <RulesViewContainer
        workflow={createWorkflow({
          entryRules: [rule],
          selectedRuleId: rule.id,
          workspaceMode: "version",
          versionDraft: createRuleVersionDraftFromRule(rule),
        })}
      />,
    );

    expect(html).toContain("追加规则版本");
    expect(html).toContain("目标规则");
    expect(html).toContain("新版执行标准");
    expect(html).toContain("v4");
    expect(html).not.toContain("<select");
  });
});
