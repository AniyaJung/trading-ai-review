import { useCallback, useState } from "react";
import { parseChecklistText } from "./rulePanel";

const defaultRuleMessage =
  "先把常用入场规则写成版本，录入交易时就能绑定当时执行的规则。";

export type RuleDraft = {
  name: string;
  marketType: string;
  description: string;
  content: string;
  checklistText: string;
};

export type RuleVersionDraft = {
  entryRuleId: string;
  content: string;
  checklistText: string;
};

export type RuleWorkflowState = {
  entryRules: EntryRuleWithLatestVersion[];
  isLoadingRules: boolean;
  ruleMessage: string;
  ruleErrors: string[];
  ruleDraft: RuleDraft;
  versionDraft: RuleVersionDraft;
  isSavingRule: boolean;
};

export function createRuleDraft(): RuleDraft {
  return {
    name: "",
    marketType: "index_futures",
    description: "",
    content: "",
    checklistText: "",
  };
}

export function createRuleVersionDraft(): RuleVersionDraft {
  return {
    entryRuleId: "",
    content: "",
    checklistText: "",
  };
}

export function createRuleWorkflowInitialState(): RuleWorkflowState {
  return {
    entryRules: [],
    isLoadingRules: false,
    ruleMessage: defaultRuleMessage,
    ruleErrors: [],
    ruleDraft: createRuleDraft(),
    versionDraft: createRuleVersionDraft(),
    isSavingRule: false,
  };
}

export function getRuleRuntimeUnavailableError() {
  return "当前是浏览器预览，无法写入规则库；请在桌面应用中操作。";
}

export function getRuleValidationErrors(draft: RuleDraft) {
  return !draft.name.trim() || !draft.content.trim()
    ? ["请填写规则名称，并补充这个版本的规则内容。"]
    : [];
}

export function getRuleVersionValidationErrors(draft: RuleVersionDraft) {
  const entryRuleId = Number(draft.entryRuleId);

  if (!Number.isInteger(entryRuleId) || entryRuleId <= 0) {
    return ["请先选择要追加新版本的规则。"];
  }

  if (!draft.content.trim()) {
    return ["请填写新版本的规则内容。"];
  }

  return [];
}

export function useRuleWorkflow(
  desktopApi: DesktopApi | undefined,
  selectTradeRuleVersion: (entryRuleVersionId: number | null) => void,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const [entryRules, setEntryRules] = useState<EntryRuleWithLatestVersion[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [ruleMessage, setRuleMessage] = useState(defaultRuleMessage);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() => createRuleDraft());
  const [versionDraft, setVersionDraft] = useState<RuleVersionDraft>(() =>
    createRuleVersionDraft(),
  );
  const [isSavingRule, setIsSavingRule] = useState(false);

  const refreshRules = useCallback(async () => {
    if (!desktopApi) {
      return;
    }

    setIsLoadingRules(true);
    try {
      const activeRules = await desktopApi.rules.listActive();
      setEntryRules(activeRules);
      setRuleErrors([]);
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsLoadingRules(false);
    }
  }, [desktopApi]);

  const handleCreateRule = async () => {
    setRuleErrors([]);

    if (!desktopApi) {
      setRuleErrors([getRuleRuntimeUnavailableError()]);
      return;
    }

    const validationErrors = getRuleValidationErrors(ruleDraft);
    if (validationErrors.length > 0) {
      setRuleErrors(validationErrors);
      return;
    }

    setIsSavingRule(true);
    try {
      const created = await desktopApi.rules.create({
        name: ruleDraft.name,
        description: ruleDraft.description || null,
        marketType: ruleDraft.marketType || null,
        content: ruleDraft.content,
        checklist: parseChecklistText(ruleDraft.checklistText),
      });
      setRuleDraft(createRuleDraft());
      setVersionDraft((current) => ({
        ...current,
        entryRuleId: String(created.id),
      }));
      selectTradeRuleVersion(created.latestVersion.id);
      await refreshRules();
      setRuleMessage("规则已创建，并已自动绑定到交易表单。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleCreateRuleVersion = async () => {
    setRuleErrors([]);

    if (!desktopApi) {
      setRuleErrors([getRuleRuntimeUnavailableError()]);
      return;
    }

    const validationErrors = getRuleVersionValidationErrors(versionDraft);
    if (validationErrors.length > 0) {
      setRuleErrors(validationErrors);
      return;
    }

    setIsSavingRule(true);
    try {
      const version = await desktopApi.rules.createVersion({
        entryRuleId: Number(versionDraft.entryRuleId),
        content: versionDraft.content,
        checklist: parseChecklistText(versionDraft.checklistText),
      });
      setVersionDraft((current) => ({
        ...current,
        content: "",
        checklistText: "",
      }));
      selectTradeRuleVersion(version.id);
      await refreshRules();
      setRuleMessage("规则新版本已创建，并已自动绑定到交易表单。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleArchiveRule = async (rule: EntryRuleWithLatestVersion) => {
    if (
      !confirmAction(
        `归档规则 ${rule.name}？它会从可选规则中隐藏，但历史交易的绑定会保留。`,
      )
    ) {
      return;
    }

    if (!desktopApi) {
      setRuleErrors([getRuleRuntimeUnavailableError()]);
      return;
    }

    setIsSavingRule(true);
    try {
      await desktopApi.rules.archive(rule.id);
      await refreshRules();
      selectTradeRuleVersion(null);
      setRuleMessage("规则已归档，历史交易仍会保留原版本绑定。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const applyBootstrapRules = useCallback(
    (activeRules: EntryRuleWithLatestVersion[]) => {
      setEntryRules(activeRules);
      setRuleErrors([]);
    },
    [],
  );

  const setRuleLoadFailure = useCallback((message: string) => {
    setRuleErrors([message]);
  }, []);

  return {
    state: {
      entryRules,
      isLoadingRules,
      ruleMessage,
      ruleErrors,
      ruleDraft,
      versionDraft,
      isSavingRule,
    },
    actions: {
      setIsLoadingRules,
      setRuleDraft,
      setVersionDraft,
      refreshRules,
      handleCreateRule,
      handleCreateRuleVersion,
      handleArchiveRule,
      applyBootstrapRules,
      setRuleLoadFailure,
    },
  };
}

export type RuleWorkflow = ReturnType<typeof useRuleWorkflow>;
