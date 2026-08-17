import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DesktopApi,
  TagDefinition,
  TradeTagAssignment,
} from "../../shared/contracts/desktopApi";
import type { TagCategory } from "../../shared/contracts/statsContracts";

export type TagDraft = {
  name: string;
  category: TagCategory;
};

export const tagCategoryOptions: Array<{
  value: TagCategory;
  label: string;
}> = [
  { value: "setup", label: "策略" },
  { value: "mistake", label: "错误" },
  { value: "emotion", label: "情绪" },
  { value: "market", label: "市场" },
];

export function getTagCategoryLabel(category: TagCategory) {
  return (
    tagCategoryOptions.find((option) => option.value === category)?.label ??
    category
  );
}

export function getDeleteTagConfirmationMessage(tag: TagDefinition) {
  const usage =
    tag.tradeCount === 0
      ? "当前没有交易使用它"
      : `将同时从 ${tag.tradeCount} 笔交易中移除`;
  return `确认删除标签“${tag.name}”？${usage}，此操作无法撤销。`;
}

export function useTagWorkflow(
  desktopApi: DesktopApi | undefined,
  trades: TradeSummary[],
  selectedTradeId: number | null,
  onDataChanged: () => Promise<void>,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [assignments, setAssignments] = useState<TradeTagAssignment[]>([]);
  const [assignmentsTradeId, setAssignmentsTradeId] = useState<number | null>(
    null,
  );
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [draft, setDraft] = useState<TagDraft>({
    name: "",
    category: "setup",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TagCategory | "all">(
    "all",
  );
  const [isLoadingTags, setIsLoadingTags] = useState(desktopApi != null);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refreshTags = useCallback(async () => {
    if (!desktopApi) {
      setTags([]);
      return;
    }

    setIsLoadingTags(true);
    try {
      setTags(await desktopApi.tags.list());
      setError(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoadingTags(false);
    }
  }, [desktopApi]);

  const refreshAssignments = useCallback(
    async (tradeId: number | null) => {
      if (!desktopApi || tradeId == null) {
        setAssignments([]);
        setAssignmentsTradeId(null);
        return;
      }

      try {
        setAssignments(await desktopApi.tags.listForTrade(tradeId));
        setAssignmentsTradeId(tradeId);
        setError(null);
      } catch (nextError) {
        setError(toErrorMessage(nextError));
      }
    },
    [desktopApi],
  );

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    let cancelled = false;
    void desktopApi.tags.list().then(
      (nextTags) => {
        if (!cancelled) {
          setTags(nextTags);
          setError(null);
          setIsLoadingTags(false);
        }
      },
      (nextError: unknown) => {
        if (!cancelled) {
          setError(toErrorMessage(nextError));
          setIsLoadingTags(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [desktopApi]);

  const activeTradeId =
    selectedTradeId != null &&
    trades.some((trade) => trade.id === selectedTradeId)
      ? selectedTradeId
      : (trades[0]?.id ?? null);

  useEffect(() => {
    if (!desktopApi || activeTradeId == null) {
      return;
    }

    let cancelled = false;
    void desktopApi.tags.listForTrade(activeTradeId).then(
      (nextAssignments) => {
        if (!cancelled) {
          setAssignments(nextAssignments);
          setAssignmentsTradeId(activeTradeId);
          setError(null);
        }
      },
      (nextError: unknown) => {
        if (!cancelled) {
          setAssignmentsTradeId(activeTradeId);
          setError(toErrorMessage(nextError));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeTradeId, desktopApi]);

  const activeAssignments = useMemo(
    () => (assignmentsTradeId === activeTradeId ? assignments : []),
    [activeTradeId, assignments, assignmentsTradeId],
  );

  const visibleTags = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return tags.filter(
      (tag) =>
        (categoryFilter === "all" || tag.category === categoryFilter) &&
        (!normalizedQuery ||
          tag.name.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [categoryFilter, searchQuery, tags]);

  const assignedTagIds = useMemo(
    () => new Set(activeAssignments.map((assignment) => assignment.tagId)),
    [activeAssignments],
  );
  const isLoadingAssignments =
    activeTradeId != null && assignmentsTradeId !== activeTradeId;
  const availableTags = useMemo(
    () =>
      isLoadingAssignments
        ? []
        : tags.filter((tag) => !assignedTagIds.has(tag.id)),
    [assignedTagIds, isLoadingAssignments, tags],
  );
  const activeSelectedTagId = availableTags.some(
    (tag) => tag.id === Number(selectedTagId),
  )
    ? selectedTagId
    : "";

  const handleCreateTag = async () => {
    if (!desktopApi) {
      setError("标签管理仅在桌面应用中可用。");
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      const created = await desktopApi.tags.create(draft);
      setDraft((current) => ({ ...current, name: "" }));
      setMessage(`已创建标签“${created.name}”。`);
      await refreshTags();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTag = async (tag: TagDefinition) => {
    if (!desktopApi || !confirmAction(getDeleteTagConfirmationMessage(tag))) {
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      const result = await desktopApi.tags.delete(tag.id);
      if (!result.deleted) {
        throw new Error("标签已不存在，请刷新后重试。");
      }
      setSelectedTagId((current) =>
        Number(current) === tag.id ? "" : current,
      );
      setMessage(
        result.affectedTradeCount > 0
          ? `已删除“${tag.name}”，并从 ${result.affectedTradeCount} 笔交易中移除。`
          : `已删除标签“${tag.name}”。`,
      );
      await Promise.all([
        refreshTags(),
        refreshAssignments(activeTradeId),
        onDataChanged(),
      ]);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsMutating(false);
    }
  };

  const handleAssignTag = async () => {
    if (!desktopApi || activeTradeId == null || !activeSelectedTagId) {
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      const assigned = await desktopApi.tags.assignManual({
        tradeId: activeTradeId,
        tagId: Number(activeSelectedTagId),
      });
      setSelectedTagId("");
      setMessage(`已手动添加标签“${assigned.name}”。`);
      await Promise.all([
        refreshTags(),
        refreshAssignments(activeTradeId),
        onDataChanged(),
      ]);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemoveTag = async (assignment: TradeTagAssignment) => {
    if (!desktopApi) {
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      await desktopApi.tags.removeFromTrade({
        tradeId: assignment.tradeId,
        tagId: assignment.tagId,
      });
      setMessage(`已从当前交易移除标签“${assignment.name}”。`);
      await Promise.all([
        refreshTags(),
        refreshAssignments(assignment.tradeId),
        onDataChanged(),
      ]);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsMutating(false);
    }
  };

  return {
    state: {
      tags,
      visibleTags,
      assignments: activeAssignments,
      availableTags,
      selectedTradeId: activeTradeId,
      selectedTagId: activeSelectedTagId,
      draft,
      searchQuery,
      categoryFilter,
      isLoadingTags,
      isLoadingAssignments,
      isMutating,
      message,
      error,
    },
    actions: {
      setDraft,
      setSearchQuery,
      setCategoryFilter,
      setSelectedTagId,
      refreshTags,
      handleCreateTag,
      handleDeleteTag,
      handleAssignTag,
      handleRemoveTag,
    },
  };
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type TagWorkflow = ReturnType<typeof useTagWorkflow>;
