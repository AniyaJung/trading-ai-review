import {
  Archive,
  FilePlus2,
  Layers3,
  ListChecks,
  Plus,
} from "lucide-react";
import type {
  RuleDraft,
  RuleVersionDraft,
  RuleWorkspaceMode,
} from "../app/ruleWorkflow";

type RulesViewProps = {
  entryRules: EntryRuleWithLatestVersion[];
  selectedRule: EntryRuleWithLatestVersion | null;
  workspaceMode: RuleWorkspaceMode;
  isLoadingRules: boolean;
  isSavingRule: boolean;
  ruleDraft: RuleDraft;
  versionDraft: RuleVersionDraft;
  ruleErrors: string[];
  ruleMessage: string;
  onRuleDraftChange: (draft: RuleDraft) => void;
  onVersionDraftChange: (draft: RuleVersionDraft) => void;
  onCreateRule: () => void;
  onCreateRuleVersion: () => void;
  onSelectRule: (ruleId: number) => void;
  onStartRuleVersion: (rule: EntryRuleWithLatestVersion) => void;
  onArchiveRule: (rule: EntryRuleWithLatestVersion) => void;
};

export function RulesView({
  entryRules,
  selectedRule,
  workspaceMode,
  isLoadingRules,
  isSavingRule,
  ruleDraft,
  versionDraft,
  ruleErrors,
  ruleMessage,
  onRuleDraftChange,
  onVersionDraftChange,
  onCreateRule,
  onCreateRuleVersion,
  onSelectRule,
  onStartRuleVersion,
  onArchiveRule,
}: RulesViewProps) {
  if (workspaceMode === "create") {
    return (
      <RuleCreatePanel
        draft={ruleDraft}
        isSaving={isSavingRule}
        errors={ruleErrors}
        message={ruleMessage}
        onChange={onRuleDraftChange}
        onSubmit={onCreateRule}
      />
    );
  }

  if (workspaceMode === "version") {
    return (
      <RuleVersionPanel
        rule={selectedRule}
        draft={versionDraft}
        isSaving={isSavingRule}
        errors={ruleErrors}
        message={ruleMessage}
        onChange={onVersionDraftChange}
        onSubmit={onCreateRuleVersion}
      />
    );
  }

  return (
    <section className="rules-workspace rules-browse-mode">
      <RuleFeedback errors={ruleErrors} message={ruleMessage} />
      <div className="rules-browser-grid">
        <section className="panel rule-library-panel" aria-label="规则库">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Rule library</p>
              <h3>规则库</h3>
            </div>
            <span className="count-pill">{entryRules.length}</span>
          </div>

          {isLoadingRules ? (
            <div className="table-state">正在读取你的规则库...</div>
          ) : entryRules.length === 0 ? (
            <div className="table-state">
              还没有入场规则，请从右上角新建第一条规则。
            </div>
          ) : (
            <div className="rule-library-list">
              {entryRules.map((rule) => {
                const selected = rule.id === selectedRule?.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    className={`rule-library-row ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => onSelectRule(rule.id)}
                  >
                    <span className="rule-library-main">
                      <strong>{rule.name}</strong>
                      <small>{rule.description ?? "未添加描述"}</small>
                    </span>
                    <span className="rule-library-meta">
                      <small>{formatMarketType(rule.marketType)}</small>
                      <strong>v{rule.latestVersion.versionNo}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <RuleDetailPanel
          rule={selectedRule}
          isSaving={isSavingRule}
          onStartVersion={onStartRuleVersion}
          onArchive={onArchiveRule}
        />
      </div>
    </section>
  );
}

function RuleCreatePanel({
  draft,
  isSaving,
  errors,
  message,
  onChange,
  onSubmit,
}: {
  draft: RuleDraft;
  isSaving: boolean;
  errors: string[];
  message: string;
  onChange: (draft: RuleDraft) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rules-workspace rules-form-mode">
      <section className="panel rule-editor-panel" aria-label="新建入场规则">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New rule</p>
            <h3>新建入场规则</h3>
          </div>
          <span className="trade-form-mode">
            <FilePlus2 aria-hidden="true" size={15} />
            新规则
          </span>
        </div>

        <form
          className="rule-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isSaving) {
              onSubmit();
            }
          }}
        >
          <div className="rule-editor-grid">
            <label>
              规则名称
              <input
                autoFocus
                value={draft.name}
                placeholder="例如：MES 1 分钟 EMA20 顺势突破"
                onChange={(event) =>
                  onChange({ ...draft, name: event.currentTarget.value })
                }
              />
            </label>
            <label>
              市场类型
              <input
                value={draft.marketType}
                placeholder="例如：index_futures"
                onChange={(event) =>
                  onChange({ ...draft, marketType: event.currentTarget.value })
                }
              />
            </label>
            <label className="wide-field">
              简要说明
              <textarea
                value={draft.description}
                placeholder="概括适用行情和入场场景"
                onChange={(event) =>
                  onChange({ ...draft, description: event.currentTarget.value })
                }
              />
            </label>
            <label className="wide-field">
              规则执行标准
              <textarea
                className="rule-standard-input"
                value={draft.content}
                placeholder="写清触发条件、无效条件、止损位置和风险要求"
                onChange={(event) =>
                  onChange({ ...draft, content: event.currentTarget.value })
                }
              />
            </label>
            <label className="wide-field">
              入场检查项
              <textarea
                value={draft.checklistText}
                placeholder="每行一个检查项，例如：价格位于 EMA20 上方"
                onChange={(event) =>
                  onChange({
                    ...draft,
                    checklistText: event.currentTarget.value,
                  })
                }
              />
            </label>
          </div>
        </form>

        <RuleFeedback errors={errors} message={message} embedded />
      </section>
    </section>
  );
}

function RuleVersionPanel({
  rule,
  draft,
  isSaving,
  errors,
  message,
  onChange,
  onSubmit,
}: {
  rule: EntryRuleWithLatestVersion | null;
  draft: RuleVersionDraft;
  isSaving: boolean;
  errors: string[];
  message: string;
  onChange: (draft: RuleVersionDraft) => void;
  onSubmit: () => void;
}) {
  if (!rule) {
    return (
      <section className="rules-workspace rules-form-mode">
        <section className="panel rule-editor-panel">
          <div className="table-state">目标规则已不可用，请返回规则库重试。</div>
        </section>
      </section>
    );
  }

  const nextVersion = rule.latestVersion.versionNo + 1;

  return (
    <section className="rules-workspace rules-form-mode">
      <section className="panel rule-editor-panel" aria-label="追加规则版本">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Immutable version</p>
            <h3>追加规则版本</h3>
          </div>
          <span className="trade-form-mode editing">
            <Layers3 aria-hidden="true" size={15} />v{nextVersion}
          </span>
        </div>

        <div className="rule-version-context">
          <div>
            <span>目标规则</span>
            <strong>{rule.name}</strong>
          </div>
          <div>
            <span>当前版本</span>
            <strong>v{rule.latestVersion.versionNo}</strong>
          </div>
          <div>
            <span>市场类型</span>
            <strong>{formatMarketType(rule.marketType)}</strong>
          </div>
        </div>

        <form
          className="rule-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isSaving) {
              onSubmit();
            }
          }}
        >
          <div className="rule-editor-grid single-column">
            <label>
              新版执行标准
              <textarea
                autoFocus
                className="rule-standard-input"
                value={draft.content}
                onChange={(event) =>
                  onChange({ ...draft, content: event.currentTarget.value })
                }
              />
            </label>
            <label>
              新版检查项
              <textarea
                value={draft.checklistText}
                placeholder="每行一个检查项；留空则该版本不做 Checklist 检查"
                onChange={(event) =>
                  onChange({
                    ...draft,
                    checklistText: event.currentTarget.value,
                  })
                }
              />
            </label>
          </div>
        </form>

        <RuleFeedback errors={errors} message={message} embedded />
      </section>
    </section>
  );
}

function RuleDetailPanel({
  rule,
  isSaving,
  onStartVersion,
  onArchive,
}: {
  rule: EntryRuleWithLatestVersion | null;
  isSaving: boolean;
  onStartVersion: (rule: EntryRuleWithLatestVersion) => void;
  onArchive: (rule: EntryRuleWithLatestVersion) => void;
}) {
  if (!rule) {
    return (
      <section className="panel rule-detail-panel" aria-label="规则详情">
        <div className="rule-detail-empty">
          <ListChecks aria-hidden="true" size={28} />
          <strong>暂无可查看的规则</strong>
          <span>新建规则后会在这里显示执行标准与检查项。</span>
        </div>
      </section>
    );
  }

  return (
    <section className="panel rule-detail-panel" aria-label="规则详情">
      <div className="panel-heading rule-detail-heading">
        <div>
          <p className="eyebrow">Active rule</p>
          <h3>{rule.name}</h3>
        </div>
        <span className="rule-version-chip">
          当前 v{rule.latestVersion.versionNo}
        </span>
      </div>

      <div className="rule-detail-summary">
        <span>{formatMarketType(rule.marketType)}</span>
        <p>{rule.description ?? "未添加规则说明。"}</p>
      </div>

      <section className="rule-detail-section">
        <div className="rule-detail-section-heading">
          <Layers3 aria-hidden="true" size={17} />
          <strong>当前执行标准</strong>
        </div>
        <p className="rule-standard-copy">{rule.latestVersion.content}</p>
      </section>

      <section className="rule-detail-section">
        <div className="rule-detail-section-heading">
          <ListChecks aria-hidden="true" size={17} />
          <strong>入场检查项</strong>
          <span>{rule.latestVersion.checklist.length}</span>
        </div>
        {rule.latestVersion.checklist.length > 0 ? (
          <ol className="rule-checklist">
            {rule.latestVersion.checklist.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rule-detail-section-empty">当前版本没有检查项。</div>
        )}
      </section>

      <div className="rule-detail-actions">
        <button
          type="button"
          className="primary-button"
          disabled={isSaving}
          onClick={() => onStartVersion(rule)}
        >
          <Plus aria-hidden="true" size={17} />
          追加新版本
        </button>
        <button
          type="button"
          className="danger-button"
          disabled={isSaving}
          onClick={() => onArchive(rule)}
        >
          <Archive aria-hidden="true" size={16} />
          归档规则
        </button>
      </div>
    </section>
  );
}

function RuleFeedback({
  errors,
  message,
  embedded = false,
}: {
  errors: string[];
  message: string;
  embedded?: boolean;
}) {
  if (errors.length === 0 && !message) {
    return null;
  }

  return (
    <div
      className={`${errors.length > 0 ? "form-status error" : "form-status"} ${
        embedded ? "rule-feedback-embedded" : "rule-feedback"
      }`}
    >
      {errors.length > 0 ? (
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : (
        message
      )}
    </div>
  );
}

function formatMarketType(marketType: string | null) {
  if (!marketType) {
    return "未分类";
  }

  return marketType === "index_futures" ? "股指期货" : marketType;
}
