import { useMemo, useSyncExternalStore } from "react";
import type { DesktopApi } from "../../shared/contracts/desktopApi";
import type { TradeResearchRecord } from "../../shared/contracts/researchContracts";
import { researchDraftToFields, researchFieldsToDraft, type ResearchDraft, type ResearchFieldId } from "../../shared/trading/researchFields";

export type ResearchEntry = {
  record?: TradeResearchRecord;
  draft?: ResearchDraft;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  message: string;
};
const emptyEntry: ResearchEntry = { isLoading: false, isSaving: false, error: null, message: "" };
const initialFields = { recordTiming: "post_trade", studyPhase: "discovery" } as const;

export function createTradeResearchStore(api: DesktopApi["research"] | undefined) {
  let entries: Record<number, ResearchEntry> = {};
  const listeners = new Set<() => void>();
  const generations = new Map<number, number>();
  const revisions = new Map<number, number>();
  const update = (tradeId: number, patch: Partial<ResearchEntry>) => {
    entries = { ...entries, [tradeId]: { ...emptyEntry, ...entries[tradeId], ...patch } };
    listeners.forEach((listener) => listener());
  };
  const store = {
    getSnapshot: () => entries,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async loadForTrade(tradeId: number, force = false) {
      const entry = entries[tradeId];
      if (entry?.isLoading || (!force && entry?.draft)) return;
      const generation = (generations.get(tradeId) ?? 0) + 1;
      generations.set(tradeId, generation);
      update(tradeId, { isLoading: true, error: null });
      try {
        const record = api ? await api.getForTrade(tradeId) : entry?.record;
        if (generations.get(tradeId) !== generation) return;
        update(tradeId, {
          record,
          draft: researchFieldsToDraft(record?.fields ?? initialFields),
          isLoading: false,
        });
      } catch (error) {
        if (generations.get(tradeId) === generation) {
          update(tradeId, { isLoading: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    },
    updateDraft(tradeId: number, field: ResearchFieldId, value: string) {
      const entry = entries[tradeId];
      if (!entry?.draft) return;
      revisions.set(tradeId, (revisions.get(tradeId) ?? 0) + 1);
      update(tradeId, { draft: { ...entry.draft, [field]: value }, error: null, message: "" });
    },
    async saveForTrade(tradeId: number) {
      const entry = entries[tradeId];
      if (!entry?.draft || entry.isSaving || entry.isLoading) return;
      const generation = generations.get(tradeId);
      const revision = revisions.get(tradeId) ?? 0;
      try {
        const fields = researchDraftToFields(entry.draft);
        update(tradeId, { isSaving: true, error: null, message: "" });
        const now = new Date().toISOString();
        const record = api ? await api.saveForTrade({ tradeId, fields }) : {
          tradeId, fields, createdAt: entry.record?.createdAt ?? now, updatedAt: now,
        };
        if (generations.get(tradeId) !== generation) return;
        update(tradeId, {
          record,
          ...((revisions.get(tradeId) ?? 0) === revision ? { draft: researchFieldsToDraft(record.fields) } : {}),
          isSaving: false,
          message: api ? "研究记录已保存。" : "研究记录已保存到当前预览会话。",
        });
        return record;
      } catch (error) {
        if (generations.get(tradeId) === generation) {
          update(tradeId, { isSaving: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    },
    removeForTrade(tradeId: number) {
      generations.set(tradeId, (generations.get(tradeId) ?? 0) + 1);
      const next = { ...entries };
      delete next[tradeId];
      entries = next;
      listeners.forEach((listener) => listener());
    },
  };
  return store;
}

export function isResearchDraftDirty(entry: ResearchEntry) {
  if (!entry.draft) return false;
  const saved = researchFieldsToDraft(entry.record?.fields ?? initialFields);
  return [...new Set([...Object.keys(saved), ...Object.keys(entry.draft)])]
    .some((key) => (entry.draft?.[key as ResearchFieldId]?.trim() ?? "") !== (saved[key as ResearchFieldId] ?? ""));
}

export function useTradeResearchWorkflow(api: DesktopApi | undefined) {
  const store = useMemo(() => createTradeResearchStore(api?.research), [api]);
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { entries, actions: store };
}

export type TradeResearchWorkflow = ReturnType<typeof useTradeResearchWorkflow>;
