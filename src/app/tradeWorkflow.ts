import { useCallback, useMemo, useState } from "react";
import {
  buildCreateClosedTradeInput,
  calculateTradeFormPreview,
  createInitialTradeForm,
  createTradeFormAfterSave,
  createTradeFormFromDetail,
  type TradeFormState,
} from "./tradeForm";
import { getInitialTrades, type RendererRuntime } from "./tradeList";
import { formatTradeTime, updatePreviewTradeSummary } from "./previewTrades";

const defaultFormMessage =
  "填写一笔已平仓交易，保存后会安全写入本机数据库。";

export type SelectedTradeDetailState = {
  tradeId: number;
  detail: TradeDetail | undefined;
};

export type TradeDetailErrorState = {
  tradeId: number;
  error: string;
};

export type TradeWorkflowState = {
  trades: TradeSummary[];
  tradeForm: TradeFormState;
  formMessage: string;
  formErrors: string[];
  isSavingTrade: boolean;
  isDeletingTrade: boolean;
  editingTradeId: number | null;
  isLoadingTrades: boolean;
  tradeLoadError: string | null;
  selectedTradeId: number | null;
  selectedTradeDetailState: SelectedTradeDetailState | undefined;
  loadingTradeDetailId: number | null;
  tradeDetailErrorState: TradeDetailErrorState | undefined;
};

export function createTradeWorkflowInitialState(
  runtime: RendererRuntime,
  sampleTrades: TradeSummary[],
): TradeWorkflowState {
  return {
    trades: getInitialTrades(runtime, sampleTrades),
    tradeForm: createInitialTradeForm(),
    formMessage: defaultFormMessage,
    formErrors: [],
    isSavingTrade: false,
    isDeletingTrade: false,
    editingTradeId: null,
    isLoadingTrades: false,
    tradeLoadError: null,
    selectedTradeId: null,
    selectedTradeDetailState: undefined,
    loadingTradeDetailId: null,
    tradeDetailErrorState: undefined,
  };
}

export function getTradeValidationFailureMessage() {
  return "还有几项交易事实需要补全，请按提示修改后再保存。";
}

export function getTradeRuntimePreviewSaveMessage() {
  return "当前是浏览器预览，不会写入数据库；在桌面应用中保存才会落盘。";
}

export function getDeleteTradeConfirmationMessage(trade: TradeSummary) {
  return `确认删除 ${trade.symbol} ${formatTradeTime(
    trade.openedAt,
  )} 这笔交易？关联的成交明细、截图和复盘记录也会一起移除。`;
}

export function resetTradeDetailStateForTrade(
  state: SelectedTradeDetailState | undefined,
  tradeId: number,
) {
  return state?.tradeId === tradeId ? undefined : state;
}

export function useTradeWorkflow(
  desktopApi: DesktopApi | undefined,
  runtime: RendererRuntime,
  sampleTrades: TradeSummary[],
  instruments: InstrumentConfig[],
  refreshStats: () => Promise<void>,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const initialState = useMemo(
    () => createTradeWorkflowInitialState(runtime, sampleTrades),
    [runtime, sampleTrades],
  );
  const [trades, setTrades] = useState<TradeSummary[]>(initialState.trades);
  const [tradeForm, setTradeForm] = useState<TradeFormState>(
    initialState.tradeForm,
  );
  const [formMessage, setFormMessage] = useState<string>(
    initialState.formMessage,
  );
  const [formErrors, setFormErrors] = useState<string[]>(
    initialState.formErrors,
  );
  const [isSavingTrade, setIsSavingTrade] = useState(
    initialState.isSavingTrade,
  );
  const [isDeletingTrade, setIsDeletingTrade] = useState(
    initialState.isDeletingTrade,
  );
  const [editingTradeId, setEditingTradeId] = useState<number | null>(
    initialState.editingTradeId,
  );
  const [isLoadingTrades, setIsLoadingTrades] = useState(
    initialState.isLoadingTrades,
  );
  const [tradeLoadError, setTradeLoadError] = useState<string | null>(
    initialState.tradeLoadError,
  );
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(
    initialState.selectedTradeId,
  );
  const [selectedTradeDetailState, setSelectedTradeDetailState] = useState<
    SelectedTradeDetailState | undefined
  >(initialState.selectedTradeDetailState);
  const [loadingTradeDetailId, setLoadingTradeDetailId] = useState<number | null>(
    initialState.loadingTradeDetailId,
  );
  const [tradeDetailErrorState, setTradeDetailErrorState] = useState<
    TradeDetailErrorState | undefined
  >(initialState.tradeDetailErrorState);

  const formPreview = useMemo(
    () => calculateTradeFormPreview(tradeForm, instruments),
    [tradeForm, instruments],
  );

  const updateTradeForm = (field: keyof TradeFormState, value: string) => {
    setTradeForm((current) => ({ ...current, [field]: value }));
    setFormErrors([]);
  };

  const loadTradeDetail = useCallback(
    async (tradeId: number) => {
      if (!desktopApi) {
        return;
      }

      setLoadingTradeDetailId(tradeId);
      try {
        const detail = await desktopApi.trades.get(tradeId);
        setSelectedTradeDetailState({ tradeId, detail });
        setTradeDetailErrorState(undefined);
      } catch (error) {
        setTradeDetailErrorState({
          tradeId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoadingTradeDetailId((current) =>
          current === tradeId ? null : current,
        );
      }
    },
    [desktopApi],
  );

  const handleCreateClosedTrade = async () => {
    setFormErrors([]);
    const result = buildCreateClosedTradeInput(tradeForm);

    if (!result.ok) {
      setFormErrors(result.errors);
      setFormMessage(getTradeValidationFailureMessage());
      return;
    }

    if (editingTradeId != null) {
      setIsSavingTrade(true);
      try {
        if (desktopApi) {
          const updatedTrade = await desktopApi.trades.update(
            editingTradeId,
            result.input,
          );

          if (!updatedTrade) {
            throw new Error("交易不存在，无法更新。");
          }

          setTrades(await desktopApi.trades.list());
          await refreshStats();
          setSelectedTradeId(updatedTrade.id);
          setSelectedTradeDetailState(undefined);
        } else {
          const updatedTrades = updatePreviewTradeSummary(
            trades,
            editingTradeId,
            result.input,
            formPreview,
          );
          setTrades(updatedTrades);
          setSelectedTradeId(editingTradeId);
        }

        setEditingTradeId(null);
        setTradeForm(createTradeFormAfterSave(tradeForm));
        setFormMessage("交易已更新，盈亏和成交明细已重新计算。");
      } catch (error) {
        setFormErrors([error instanceof Error ? error.message : String(error)]);
      } finally {
        setIsSavingTrade(false);
      }
      return;
    }

    if (!desktopApi) {
      setFormMessage(getTradeRuntimePreviewSaveMessage());
      setTrades(sampleTrades);
      return;
    }

    setIsSavingTrade(true);
    try {
      const createdTrade = await desktopApi.trades.createClosed(result.input);
      setTrades(await desktopApi.trades.list());
      await refreshStats();
      setSelectedTradeId(createdTrade.id);
      setTradeForm(createTradeFormAfterSave(tradeForm));
      setFormMessage("交易已保存，已生成入场/出场成交明细。");
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const handleDeleteSelectedTrade = async (
    selectedTrade: TradeSummary | undefined,
  ) => {
    if (!selectedTrade) {
      return false;
    }

    if (!confirmAction(getDeleteTradeConfirmationMessage(selectedTrade))) {
      return false;
    }

    setIsDeletingTrade(true);
    try {
      if (desktopApi) {
        await desktopApi.trades.delete(selectedTrade.id);
        const nextTrades = await desktopApi.trades.list();
        setTrades(nextTrades);
        await refreshStats();
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      } else {
        const nextTrades = trades.filter((trade) => trade.id !== selectedTrade.id);
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      }
      setSelectedTradeDetailState((current) =>
        resetTradeDetailStateForTrade(current, selectedTrade.id),
      );
      setTradeDetailErrorState(undefined);
      setEditingTradeId(null);
      setFormMessage("交易已删除，相关明细已同步清理。");
      return true;
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
      return false;
    } finally {
      setIsDeletingTrade(false);
    }
  };

  const handleEditSelectedTrade = (selectedTradeDetail: TradeDetail | undefined) => {
    if (!selectedTradeDetail) {
      return;
    }

    setEditingTradeId(selectedTradeDetail.id);
    setTradeForm(createTradeFormFromDetail(selectedTradeDetail));
    setFormErrors([]);
    setFormMessage("正在编辑选中交易。保存后会更新原记录，也可以取消编辑。");
  };

  const handleCancelEdit = () => {
    setEditingTradeId(null);
    setTradeForm(createInitialTradeForm());
    setFormErrors([]);
    setFormMessage("已取消编辑，表单已恢复为新建交易。");
  };

  const applyBootstrapTrades = useCallback((desktopTrades: TradeSummary[]) => {
    setTrades(desktopTrades);
    setSelectedTradeId((current) => current ?? desktopTrades[0]?.id ?? null);
    setTradeLoadError(null);
  }, []);

  const setTradeLoadFailure = useCallback((message: string) => {
    setTradeLoadError(message);
  }, []);

  return {
    state: {
      trades,
      tradeForm,
      formPreview,
      formMessage,
      formErrors,
      isSavingTrade,
      isDeletingTrade,
      editingTradeId,
      isLoadingTrades,
      tradeLoadError,
      selectedTradeId,
      selectedTradeDetailState,
      loadingTradeDetailId,
      tradeDetailErrorState,
    },
    actions: {
      setTrades,
      setTradeForm,
      setIsLoadingTrades,
      setSelectedTradeId,
      setSelectedTradeDetailState,
      setTradeDetailErrorState,
      setFormMessage,
      updateTradeForm,
      loadTradeDetail,
      handleCreateClosedTrade,
      handleDeleteSelectedTrade,
      handleEditSelectedTrade,
      handleCancelEdit,
      applyBootstrapTrades,
      setTradeLoadFailure,
    },
  };
}

export type TradeWorkflow = ReturnType<typeof useTradeWorkflow>;
