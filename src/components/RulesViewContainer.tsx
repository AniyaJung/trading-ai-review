import type { RuleWorkflow } from "../app/ruleWorkflow";
import { RulesView } from "./RulesView";

type RulesViewContainerProps = {
  workflow: RuleWorkflow;
};

export function RulesViewContainer({ workflow }: RulesViewContainerProps) {
  const {
    entryRules,
    isLoadingRules,
    isSavingRule,
    ruleDraft,
    versionDraft,
    ruleErrors,
    ruleMessage,
  } = workflow.state;
  const {
    setRuleDraft,
    setVersionDraft,
    handleCreateRule,
    handleCreateRuleVersion,
    handleArchiveRule,
  } = workflow.actions;

  return (
    <RulesView
      entryRules={entryRules}
      isLoadingRules={isLoadingRules}
      isSavingRule={isSavingRule}
      ruleDraft={ruleDraft}
      versionDraft={versionDraft}
      ruleErrors={ruleErrors}
      ruleMessage={ruleMessage}
      onRuleDraftChange={setRuleDraft}
      onVersionDraftChange={setVersionDraft}
      onCreateRule={() => void handleCreateRule()}
      onCreateRuleVersion={() => void handleCreateRuleVersion()}
      onArchiveRule={(rule) => void handleArchiveRule(rule)}
    />
  );
}
