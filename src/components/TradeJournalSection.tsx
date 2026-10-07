import { BookOpenText, Save } from "lucide-react";
import type { TradeJournalDraft } from "../app/tradeJournalWorkflow";

type TradeJournalSectionProps = {
  draft: TradeJournalDraft;
  journal: TradeJournal | undefined;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  message: string;
  onDraftChange: (draft: TradeJournalDraft) => void;
  onSave: () => void;
};

export function TradeJournalSection({
  draft,
  journal,
  isLoading,
  isSaving,
  error,
  message,
  onDraftChange,
  onSave,
}: TradeJournalSectionProps) {
  return (
    <section className="trade-journal-card" aria-label="人工复盘文章">
      <div className="detail-heading">
        <div className="trade-journal-title">
          <BookOpenText aria-hidden="true" size={17} />
          <strong>人工复盘文章</strong>
        </div>
        <span>{journal ? "已保存" : "尚未记录"}</span>
      </div>
      <p className="trade-journal-intro">
        把这笔交易的计划、执行、情绪和下次改进写下来，方便日后回看。
      </p>
      {isLoading ? (
        <div className="detail-state">正在读取复盘文章...</div>
      ) : (
        <>
          <label>
            标题
            <input
              value={draft.title}
              placeholder="例如：开盘回踩计划复盘"
              maxLength={200}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.currentTarget.value })
              }
            />
          </label>
          <label>
            正文
            <textarea
              rows={7}
              value={draft.content}
              placeholder="可以记录：当时看到了什么、为什么入场、执行是否按计划、哪里做得好、下次准备怎么改。"
              maxLength={100_000}
              onChange={(event) =>
                onDraftChange({ ...draft, content: event.currentTarget.value })
              }
            />
          </label>
          <div className="trade-journal-footer">
            <span>{draft.content.length.toLocaleString()} 字</span>
            <button
              type="button"
              className="secondary-button"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save aria-hidden="true" size={15} />
              {isSaving ? "正在保存" : "保存复盘文章"}
            </button>
          </div>
          {error ? <div className="form-status error">{error}</div> : null}
          {message ? <div className="form-status">{message}</div> : null}
          {journal ? (
            <small className="trade-journal-updated">
              最近保存：{formatJournalTime(journal.updatedAt)}
            </small>
          ) : null}
        </>
      )}
    </section>
  );
}

function formatJournalTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
