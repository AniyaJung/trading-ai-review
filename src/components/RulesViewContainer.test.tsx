import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRuleWorkflowInitialState } from "../app/ruleWorkflow";
import { RulesViewContainer } from "./RulesViewContainer";

describe("RulesViewContainer", () => {
  it("renders the rules view from workflow state", () => {
    const html = renderToStaticMarkup(
      <RulesViewContainer
        workflow={{
          state: createRuleWorkflowInitialState(),
          actions: {
            setIsLoadingRules: vi.fn(),
            setRuleDraft: vi.fn(),
            setVersionDraft: vi.fn(),
            refreshRules: vi.fn(),
            handleCreateRule: vi.fn(),
            handleCreateRuleVersion: vi.fn(),
            handleArchiveRule: vi.fn(),
            applyBootstrapRules: vi.fn(),
            setRuleLoadFailure: vi.fn(),
          },
        }}
      />,
    );

    expect(html).toContain("规则版本链路");
    expect(html).toContain("先把常用入场规则写成版本");
  });
});
