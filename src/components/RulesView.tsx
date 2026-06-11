import { Archive, GitBranch, Link2, Plus } from "lucide-react";
import { buildRuleVersionLabel } from "../app/rulePanel";

type RuleDraft = {
  name: string;
  marketType: string;
  description: string;
  content: string;
  checklistText: string;
};

type VersionDraft = {
  entryRuleId: string;
  content: string;
  checklistText: string;
};

type RulesViewProps = {
  entryRules: EntryRuleWithLatestVersion[];
  isLoadingRules: boolean;
  isSavingRule: boolean;
  ruleDraft: RuleDraft;
  versionDraft: VersionDraft;
  ruleErrors: string[];
  ruleMessage: string;
  onRuleDraftChange: (draft: RuleDraft) => void;
  onVersionDraftChange: (draft: VersionDraft) => void;
  onCreateRule: () => void;
  onCreateRuleVersion: () => void;
  onArchiveRule: (rule: EntryRuleWithLatestVersion) => void;
};

export function RulesView({
  entryRules,
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
  onArchiveRule,
}: RulesViewProps) {
  return (
    <section className="rules-grid">
      <section className="panel rules-overview" aria-label="规则版本流程">
        <div>
          <p className="eyebrow">Versioned rule workflow</p>
          <h3>规则版本链路</h3>
        </div>
        <div className="rules-overview-steps">
          <div>
            <Plus aria-hidden="true" size={16} />
            <span>创建规则</span>
          </div>
          <div>
            <GitBranch aria-hidden="true" size={16} />
            <span>追加不可变版本</span>
          </div>
          <div>
            <Link2 aria-hidden="true" size={16} />
            <span>交易绑定版本</span>
          </div>
          <div>
            <Archive aria-hidden="true" size={16} />
            <span>归档不删历史</span>
          </div>
        </div>
      </section>

      <section className="panel" aria-label="新建入场规则">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Rule library</p>
            <h3>新建入场规则</h3>
          </div>
          <span className="count-pill">{entryRules.length}</span>
        </div>

        <form
          className="rule-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateRule();
          }}
        >
          <label>
            规则名称
            <input
              value={ruleDraft.name}
              onChange={(event) =>
                onRuleDraftChange({
                  ...ruleDraft,
                  name: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            市场类型
            <input
              value={ruleDraft.marketType}
              onChange={(event) =>
                onRuleDraftChange({
                  ...ruleDraft,
                  marketType: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            描述
            <textarea
              value={ruleDraft.description}
              onChange={(event) =>
                onRuleDraftChange({
                  ...ruleDraft,
                  description: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            v1 内容
            <textarea
              value={ruleDraft.content}
              onChange={(event) =>
                onRuleDraftChange({
                  ...ruleDraft,
                  content: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            Checklist
            <textarea
              placeholder="每行一个检查项"
              value={ruleDraft.checklistText}
              onChange={(event) =>
                onRuleDraftChange({
                  ...ruleDraft,
                  checklistText: event.currentTarget.value,
                })
              }
            />
          </label>
          <button type="submit" className="primary-button" disabled={isSavingRule}>
            <Plus aria-hidden="true" size={18} />
            {isSavingRule ? "保存中" : "创建规则"}
          </button>
        </form>
      </section>

      <section className="panel" aria-label="规则版本">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Immutable versions</p>
            <h3>规则版本</h3>
          </div>
        </div>

        <form
          className="rule-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateRuleVersion();
          }}
        >
          <label>
            选择规则
            <select
              value={versionDraft.entryRuleId}
              onChange={(event) =>
                onVersionDraftChange({
                  ...versionDraft,
                  entryRuleId: event.currentTarget.value,
                })
              }
            >
              <option value="">选择 active 规则</option>
              {entryRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {buildRuleVersionLabel(rule)}
                </option>
              ))}
            </select>
          </label>
          <label>
            新版本内容
            <textarea
              value={versionDraft.content}
              onChange={(event) =>
                onVersionDraftChange({
                  ...versionDraft,
                  content: event.currentTarget.value,
                })
              }
            />
          </label>
          <label>
            新版本 Checklist
            <textarea
              placeholder="每行一个检查项"
              value={versionDraft.checklistText}
              onChange={(event) =>
                onVersionDraftChange({
                  ...versionDraft,
                  checklistText: event.currentTarget.value,
                })
              }
            />
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={isSavingRule || entryRules.length === 0}
          >
            追加版本
          </button>
        </form>

        <div className={ruleErrors.length > 0 ? "form-status error" : "form-status"}>
          {ruleErrors.length > 0 ? (
            <ul>
              {ruleErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            ruleMessage
          )}
        </div>
      </section>

      <section className="panel rule-list-panel" aria-label="Active 规则列表">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Active rules</p>
            <h3>当前可选规则</h3>
          </div>
        </div>

        {isLoadingRules ? (
          <div className="table-state">正在读取规则库...</div>
        ) : entryRules.length === 0 ? (
          <div className="table-state">
            暂无 active 规则。创建规则后，交易表单可以绑定 latest version。
          </div>
        ) : (
          <div className="rule-list">
            {entryRules.map((rule) => (
              <article key={rule.id} className="rule-card">
                <div>
                  <span>{rule.marketType ?? "未分类"}</span>
                  <strong>{rule.name}</strong>
                  <p>{rule.description ?? "未填写描述"}</p>
                </div>
                <div className="rule-version-box">
                  <span>v{rule.latestVersion.versionNo}</span>
                  <p>{rule.latestVersion.content}</p>
                  {rule.latestVersion.checklist.length > 0 ? (
                    <ul>
                      {rule.latestVersion.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="rule-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      onVersionDraftChange({
                        ...versionDraft,
                        entryRuleId: String(rule.id),
                      })
                    }
                  >
                    准备新版本
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={isSavingRule}
                    onClick={() => onArchiveRule(rule)}
                  >
                    归档
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
