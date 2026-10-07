import { useCallback, useRef, useState } from "react";

export type TradeJournalDraft = {
  title: string;
  content: string;
};

export type TradeJournalWorkflowState = {
  journalByTradeId: Record<number, TradeJournal | undefined>;
  draft: TradeJournalDraft;
  loadingTradeId: number | null;
  isSaving: boolean;
  error: string | null;
  message: string;
};

const emptyDraft: TradeJournalDraft = {
  title: "",
  content: "",
};

export function createTradeJournalWorkflowInitialState(): TradeJournalWorkflowState {
  return {
    journalByTradeId: {},
    draft: emptyDraft,
    loadingTradeId: null,
    isSaving: false,
    error: null,
    message: "",
  };
}

export function useTradeJournalWorkflow(desktopApi: DesktopApi | undefined) {
  const initialState = createTradeJournalWorkflowInitialState();
  const [journalByTradeId, setJournalByTradeId] = useState(
    initialState.journalByTradeId,
  );
  const journalByTradeIdRef = useRef(journalByTradeId);
  const latestLoadToken = useRef(0);
  const [draft, setDraft] = useState<TradeJournalDraft>(initialState.draft);
  const [loadingTradeId, setLoadingTradeId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadForTrade = useCallback(
    async (tradeId: number) => {
      const loadToken = ++latestLoadToken.current;
      setError(null);
      setMessage("");
      setLoadingTradeId(tradeId);
      try {
        const journal = desktopApi
          ? await desktopApi.reviews.getJournal(tradeId)
          : journalByTradeIdRef.current[tradeId];
        if (loadToken !== latestLoadToken.current) {
          return;
        }

        setJournalByTradeId((current) => {
          const next = { ...current, [tradeId]: journal };
          journalByTradeIdRef.current = next;
          return next;
        });
        setDraft({
          title: journal?.title ?? "",
          content: journal?.content ?? "",
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (loadToken === latestLoadToken.current) {
          setLoadingTradeId((current) => (current === tradeId ? null : current));
        }
      }
    },
    [desktopApi],
  );

  const saveForTrade = useCallback(
    async (tradeId: number) => {
      const input = {
        tradeId,
        title: draft.title.trim() || "交易复盘",
        content: draft.content.trim(),
      };
      setIsSaving(true);
      setError(null);
      setMessage("");
      try {
        const journal: TradeJournal = desktopApi
          ? await desktopApi.reviews.saveJournal(input)
          : {
              ...input,
              createdAt:
                journalByTradeIdRef.current[tradeId]?.createdAt ??
                new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
        setJournalByTradeId((current) => {
          const next = { ...current, [tradeId]: journal };
          journalByTradeIdRef.current = next;
          return next;
        });
        setDraft({ title: journal.title, content: journal.content });
        setMessage(
          desktopApi
            ? "复盘文章已保存。"
            : "浏览器预览已保存到当前会话，桌面版会写入本机数据库。",
        );
        return journal;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : String(saveError));
        return undefined;
      } finally {
        setIsSaving(false);
      }
    },
    [desktopApi, draft],
  );

  const removeForTrade = useCallback((tradeId: number) => {
    setJournalByTradeId((current) => {
      const next = { ...current };
      delete next[tradeId];
      journalByTradeIdRef.current = next;
      return next;
    });
  }, []);

  return {
    state: {
      journalByTradeId,
      draft,
      loadingTradeId,
      isSaving,
      error,
      message,
    },
    actions: {
      setDraft,
      loadForTrade,
      saveForTrade,
      removeForTrade,
    },
  };
}

export type TradeJournalWorkflow = ReturnType<typeof useTradeJournalWorkflow>;
