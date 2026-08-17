import { useState } from "react";
import { Check, Pencil, Plus, Tags, X } from "lucide-react";
import { getTagCategoryLabel } from "../app/tagWorkflow";

type TradeTagSectionProps = {
  assignments: TradeTagAssignment[];
  availableTags: TagDefinition[];
  selectedTagId: string;
  isLoading: boolean;
  isMutating: boolean;
  canManage: boolean;
  message: string;
  error: string | null;
  onSelectedTagChange: (tagId: string) => void;
  onAssignTag: () => void;
  onRemoveTag: (assignment: TradeTagAssignment) => void;
};

export function TradeTagSection({
  assignments,
  availableTags,
  selectedTagId,
  isLoading,
  isMutating,
  canManage,
  message,
  error,
  onSelectedTagChange,
  onAssignTag,
  onRemoveTag,
}: TradeTagSectionProps) {
  const [isManaging, setIsManaging] = useState(false);
  const assignmentGroups = assignments.reduce<
    Array<{
      category: TradeTagAssignment["category"];
      items: TradeTagAssignment[];
    }>
  >((groups, assignment) => {
    const existingGroup = groups.find(
      (group) => group.category === assignment.category,
    );

    if (existingGroup) {
      existingGroup.items.push(assignment);
    } else {
      groups.push({ category: assignment.category, items: [assignment] });
    }

    return groups;
  }, []);

  return (
    <section
      className={`trade-detail-tags${isManaging ? " is-managing" : ""}`}
      aria-label="当前交易标签"
    >
      <div className="trade-tag-heading">
        <div className="trade-tag-heading-title">
          <span className="trade-tag-heading-icon" aria-hidden="true">
            <Tags size={16} />
          </span>
          <div>
            <strong>交易标签</strong>
            <span>{assignments.length} 个标签</span>
          </div>
        </div>
        <button
          type="button"
          className="icon-button trade-tag-manage-button"
          title={isManaging ? "完成标签管理" : "管理交易标签"}
          aria-label={isManaging ? "完成标签管理" : "管理交易标签"}
          aria-pressed={isManaging}
          disabled={!canManage || isMutating}
          onClick={() => setIsManaging((current) => !current)}
        >
          {isManaging ? (
            <Check aria-hidden="true" size={16} />
          ) : (
            <Pencil aria-hidden="true" size={15} />
          )}
        </button>
      </div>

      {isManaging ? (
        <div className="trade-tag-editor">
          <span className="trade-tag-editor-label">添加标签</span>
          <form
            className="trade-tag-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAssignTag();
            }}
          >
            <label>
              <span className="visually-hidden">给当前交易添加标签</span>
              <select
                value={selectedTagId}
                disabled={!canManage || isLoading || availableTags.length === 0}
                onChange={(event) =>
                  onSelectedTagChange(event.currentTarget.value)
                }
              >
                <option value="">
                  {availableTags.length === 0
                    ? "没有可添加的标签"
                    : "选择一个标签"}
                </option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {getTagCategoryLabel(tag.category)} · {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="secondary-button"
              disabled={!canManage || isLoading || isMutating || !selectedTagId}
            >
              <Plus aria-hidden="true" size={16} />
              添加
            </button>
          </form>
        </div>
      ) : null}

      {isLoading ? (
        <div className="trade-tag-state">正在读取标签...</div>
      ) : assignments.length === 0 ? (
        <div className="trade-tag-state">这笔交易还没有标签。</div>
      ) : (
        <div className="trade-detail-tag-list">
          {assignmentGroups.map((group) => (
            <div
              key={group.category}
              className={`trade-tag-group ${group.category}`}
            >
              <span className="trade-tag-group-label">
                {getTagCategoryLabel(group.category)}
              </span>
              <div className="trade-tag-group-items">
                {group.items.map((assignment) => (
                  <article
                    key={assignment.tagId}
                    className={`trade-detail-tag-row ${assignment.category}`}
                  >
                    <strong>{assignment.name}</strong>
                    <span
                      className={`tag-source ${assignment.source}`}
                      title={
                        assignment.source === "ai_review"
                          ? "AI 生成"
                          : "手动添加"
                      }
                    >
                      {assignment.source === "ai_review" ? "AI" : "手动"}
                    </span>
                    {isManaging ? (
                      <button
                        type="button"
                        className="icon-button trade-tag-remove-button"
                        title={`从当前交易移除 ${assignment.name}`}
                        aria-label={`从当前交易移除 ${assignment.name}`}
                        disabled={!canManage || isMutating}
                        onClick={() => onRemoveTag(assignment)}
                      >
                        <X aria-hidden="true" size={14} />
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error || message ? (
        <p className={error ? "trade-tag-feedback error" : "trade-tag-feedback"}>
          {error ?? message}
        </p>
      ) : null}
    </section>
  );
}
