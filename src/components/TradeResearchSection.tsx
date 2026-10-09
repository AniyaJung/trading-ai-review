import { useEffect } from "react";
import { FlaskConical, Save } from "lucide-react";
import { researchFieldGroups } from "../../shared/trading/researchFields";
import { isResearchDraftDirty, type TradeResearchWorkflow } from "../app/tradeResearchWorkflow";
import "../styles/research.css";

type Props = { tradeId: number; workflow: TradeResearchWorkflow };

export function TradeResearchSection({ tradeId, workflow }: Props) {
  const { loadForTrade } = workflow.actions;
  const entry = workflow.entries[tradeId];
  useEffect(() => { void loadForTrade(tradeId); }, [loadForTrade, tradeId]);
  const dirty = entry ? isResearchDraftDirty(entry) : false;

  return (
    <section className="research-record-card" aria-label="交易研究记录">
      <div className="detail-heading">
        <div className="trade-journal-title"><FlaskConical aria-hidden="true" size={17} /><strong>交易研究记录</strong></div>
        <span>{dirty ? "有未保存修改" : entry?.record ? "已保存" : "尚未记录"}</span>
      </div>
      <p className="research-hint">把当时的判断和证据留下来，在“研究”页比较不同条件下的交易表现。所有字段均可留空。</p>
      {!entry || entry.isLoading ? <div className="detail-state">正在读取研究记录...</div> : !entry.draft ? (
        <div className="form-status error" role="alert">
          研究记录读取失败：{entry.error}
          <button className="secondary-button" type="button" onClick={() => void loadForTrade(tradeId, true)}>重新读取</button>
        </div>
      ) : (
        <>
          {researchFieldGroups.map((group, index) => (
            <details className="research-field-group" key={group.title} open={index === 0 ? true : undefined}>
              <summary>{group.title}</summary>
              <p className="research-hint">{group.description}</p>
              <div className="research-fields">
                {group.fields.map((field) => (
                  <label key={field.id} className={field.multiline ? "research-wide" : undefined}>
                    {field.label}
                    {field.kind === "choice" ? (
                      <select value={entry.draft?.[field.id] ?? ""} onChange={(event) => workflow.actions.updateDraft(tradeId, field.id, event.currentTarget.value)}>
                        <option value="">未记录</option>
                        {field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.multiline ? (
                      <textarea rows={3} maxLength={3000} value={entry.draft?.[field.id] ?? ""} onChange={(event) => workflow.actions.updateDraft(tradeId, field.id, event.currentTarget.value)} />
                    ) : (
                      <input type={field.kind === "number" ? "number" : "text"} step={field.integer ? 1 : "any"} min={field.min} max={field.max} maxLength={field.kind === "text" ? 200 : undefined}
                        value={entry.draft?.[field.id] ?? ""} onChange={(event) => workflow.actions.updateDraft(tradeId, field.id, event.currentTarget.value)} />
                    )}
                    {field.hint ? <small className="research-hint">{field.hint}</small> : null}
                  </label>
                ))}
              </div>
            </details>
          ))}
          <div className="research-record-footer">
            <span className="research-hint">切换交易会保留本次会话中的草稿；关闭应用前请保存。</span>
            <button className="secondary-button" type="button" disabled={entry.isSaving || !dirty} onClick={() => void workflow.actions.saveForTrade(tradeId)}>
              <Save aria-hidden="true" size={15} />{entry.isSaving ? "正在保存" : "保存研究记录"}
            </button>
          </div>
          {entry.error ? <div className="form-status error" role="alert">{entry.error}</div> : null}
          {entry.message ? <div className="form-status" role="status">{entry.message}{dirty ? "当前还有未保存修改。" : ""}</div> : null}
        </>
      )}
    </section>
  );
}
