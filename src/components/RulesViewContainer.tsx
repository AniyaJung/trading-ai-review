import type { RuleWorkflow } from "../app/ruleWorkflow";
import { RulesView } from "./RulesView";

type RulesViewContainerProps = {
  workflow: RuleWorkflow;
};

export function RulesViewContainer({ workflow }: RulesViewContainerProps) {
  const {
    entryRules,
    workspaceMode,
    selectedRuleId,
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
    handleSelectRule,
    handleStartRuleVersion,
    handleCreateRule,
    handleCreateRuleVersion,
    handleArchiveRule,
  } = workflow.actions;
  const selectedRule =
    entryRules.find((rule) => rule.id === selectedRuleId) ?? null;

  return (
    <RulesView
      entryRules={entryRules}
      selectedRule={selectedRule}
      workspaceMode={workspaceMode}
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
      onSelectRule={handleSelectRule}
      onStartRuleVersion={handleStartRuleVersion}
      onArchiveRule={(rule) => void handleArchiveRule(rule)}
    />
  );
}
