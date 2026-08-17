import type { TagWorkflow } from "../app/tagWorkflow";
import { TagManagerView } from "./TagManagerView";

type TagManagerContainerProps = {
  runtime: string;
  workflow: TagWorkflow;
};

export function TagManagerContainer({
  runtime,
  workflow,
}: TagManagerContainerProps) {
  return (
    <TagManagerView
      runtime={runtime}
      tags={workflow.state.tags}
      visibleTags={workflow.state.visibleTags}
      draft={workflow.state.draft}
      searchQuery={workflow.state.searchQuery}
      categoryFilter={workflow.state.categoryFilter}
      isLoadingTags={workflow.state.isLoadingTags}
      isMutating={workflow.state.isMutating}
      message={workflow.state.message}
      error={workflow.state.error}
      onDraftChange={workflow.actions.setDraft}
      onSearchQueryChange={workflow.actions.setSearchQuery}
      onCategoryFilterChange={workflow.actions.setCategoryFilter}
      onCreateTag={() => void workflow.actions.handleCreateTag()}
      onDeleteTag={(tag) => void workflow.actions.handleDeleteTag(tag)}
    />
  );
}
