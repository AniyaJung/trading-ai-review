import { Plus, Search, Tag, Trash2 } from "lucide-react";
import {
  getTagCategoryLabel,
  tagCategoryOptions,
  type TagDraft,
} from "../app/tagWorkflow";
import type { TagCategory } from "../../shared/contracts/statsContracts";

type TagManagerViewProps = {
  runtime: string;
  tags: TagDefinition[];
  visibleTags: TagDefinition[];
  draft: TagDraft;
  searchQuery: string;
  categoryFilter: TagCategory | "all";
  isLoadingTags: boolean;
  isMutating: boolean;
  message: string;
  error: string | null;
  onDraftChange: (draft: TagDraft) => void;
  onSearchQueryChange: (query: string) => void;
  onCategoryFilterChange: (category: TagCategory | "all") => void;
  onCreateTag: () => void;
  onDeleteTag: (tag: TagDefinition) => void;
};

export function TagManagerView({
  runtime,
  tags,
  visibleTags,
  draft,
  searchQuery,
  categoryFilter,
  isLoadingTags,
  isMutating,
  message,
  error,
  onDraftChange,
  onSearchQueryChange,
  onCategoryFilterChange,
  onCreateTag,
  onDeleteTag,
}: TagManagerViewProps) {
  const desktopEnabled = runtime === "electron";

  return (
    <section className="tag-manager-grid">
      <section className="panel tag-create-panel" aria-label="新建标签">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tag library</p>
            <h3>新建标签</h3>
          </div>
          <Tag aria-hidden="true" size={18} />
        </div>

        <form
          className="tag-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateTag();
          }}
        >
          <label>
            标签名称
            <input
              maxLength={40}
              placeholder="例如：追涨入场"
              value={draft.name}
              onChange={(event) =>
                onDraftChange({ ...draft, name: event.currentTarget.value })
              }
            />
          </label>
          <label>
            分类
            <select
              value={draft.category}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  category: event.currentTarget.value as TagCategory,
                })
              }
            >
              {tagCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={!desktopEnabled || isMutating || !draft.name.trim()}
          >
            <Plus aria-hidden="true" size={18} />
            创建标签
          </button>
        </form>

        <div className={error ? "form-status error" : "form-status"}>
          {error ??
            (message ||
            (desktopEnabled
              ? "标签保存在本地数据库中。"
              : "标签管理仅在桌面应用中可用。"))}
        </div>
      </section>

      <section className="panel tag-library-panel" aria-label="标签库">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">All tags</p>
            <h3>标签库</h3>
          </div>
          <span className="count-pill">{tags.length}</span>
        </div>

        <div className="tag-filter-bar">
          <label className="tag-search-field">
            <span className="visually-hidden">搜索标签</span>
            <Search aria-hidden="true" size={16} />
            <input
              value={searchQuery}
              placeholder="搜索标签"
              onChange={(event) =>
                onSearchQueryChange(event.currentTarget.value)
              }
            />
          </label>
          <label>
            <span className="visually-hidden">筛选分类</span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                onCategoryFilterChange(
                  event.currentTarget.value as TagCategory | "all",
                )
              }
            >
              <option value="all">全部分类</option>
              {tagCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoadingTags ? (
          <div className="table-state">正在读取标签库...</div>
        ) : visibleTags.length === 0 ? (
          <div className="table-state">
            {tags.length === 0
              ? "还没有标签。可以在左侧创建第一条标签。"
              : "没有符合当前筛选条件的标签。"}
          </div>
        ) : (
          <div className="tag-library-list">
            {visibleTags.map((tag) => (
              <article key={tag.id} className="tag-library-row">
                <span className={`tag-chip ${tag.category}`}>
                  {getTagCategoryLabel(tag.category)}
                </span>
                <div className="tag-library-copy">
                  <strong>{tag.name}</strong>
                  <span>
                    {tag.tradeCount} 笔交易 · AI {tag.aiReviewTradeCount} · 手动{" "}
                    {tag.manualTradeCount}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-button tag-delete-button"
                  title={`删除标签 ${tag.name}`}
                  aria-label={`删除标签 ${tag.name}`}
                  disabled={isMutating}
                  onClick={() => onDeleteTag(tag)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

    </section>
  );
}
