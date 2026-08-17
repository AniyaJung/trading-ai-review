import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { navigationItems, type AppView } from "./app/views";
import { useAttachmentWorkflow } from "./app/attachmentWorkflow";
import { useTradeWorkflow } from "./app/tradeWorkflow";
import {
  loadDesktopBackupHistory,
  loadDesktopBootstrapState,
} from "./app/desktopBootstrap";
import { sampleTrades } from "./app/previewData";
import { useReviewWorkflow } from "./app/reviewWorkflow";
import { useRuleWorkflow } from "./app/ruleWorkflow";
import { useTagWorkflow } from "./app/tagWorkflow";
import {
  createStatsEntryRuleOptions,
  filterTradesForStatsDrilldown,
} from "./app/statsPanel";
import {
  getStatsRuntimePreviewState,
  useStatsWorkflow,
} from "./app/statsWorkflow";
import {
  formatStatsDrilldownLabel,
} from "./app/previewTrades";
import {
  useBackupSettingsWorkflow,
} from "./app/backupSettingsWorkflow";
import { AppSidebar } from "./components/AppSidebar";
import { AppTopbar } from "./components/AppTopbar";
import { AppWorkspaceView } from "./components/AppWorkspaceView";

function App() {
  const [currentView, setCurrentView] = useState<AppView>("trades");
  const desktopApi = window.desktopApi;
  const desktopRuntime = desktopApi?.runtime ?? "browser-preview";
  const backupSettingsWorkflow = useBackupSettingsWorkflow(desktopApi);
  const attachmentWorkflow = useAttachmentWorkflow(desktopApi);
  const reviewWorkflow = useReviewWorkflow(desktopApi);
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([]);
  const statsWorkflow = useStatsWorkflow(desktopApi);
  const tradeWorkflow = useTradeWorkflow(
    desktopApi,
    desktopRuntime,
    sampleTrades,
    instruments,
    async () => {
      await statsWorkflow.actions.refreshStats();
    },
  );
  const {
    applyBootstrapState,
    applyBackupHistory,
    clearLoadErrors: clearBackupSettingsLoadErrors,
    setBackupLoadFailure,
    setIsLoadingSettings,
    setSettingsError,
  } = backupSettingsWorkflow.actions;
  const {
    setActiveAttachmentPreviewId,
    removeTradeAttachments,
  } = attachmentWorkflow.actions;
  const {
    handleConfirmReview: confirmReview,
    handleCreateReviewDraft: generateReviewDraft,
    handleCorrectReview: correctReview,
    handleInvalidateReview: invalidateReview,
    handleCancelRuleCheckEdit,
    handleSaveRuleCheck: saveRuleCheck,
    removeReviewForTrade,
  } = reviewWorkflow.actions;
  const {
    trades,
    isTradeFormOpen,
    isSavingTrade,
    editingTradeId,
    selectedTradeId,
  } = tradeWorkflow.state;
  const {
    setTrades,
    setTradeForm,
    setIsLoadingTrades,
    setSelectedTradeId,
    setSelectedTradeDetailState,
    setFormMessage,
    handleCreateClosedTrade,
    handleStartCreateTrade,
    handleDeleteSelectedTrade: deleteSelectedTrade,
    handleCancelEdit,
    applyBootstrapTrades,
    setTradeLoadFailure,
  } = tradeWorkflow.actions;
  const ruleWorkflow = useRuleWorkflow(desktopApi, (entryRuleVersionId) => {
    setTradeForm((current) => {
      if (entryRuleVersionId == null) {
        return { ...current, entryRuleVersionId: "" };
      }

      return { ...current, entryRuleVersionId: String(entryRuleVersionId) };
    });
  });
  const {
    tradeDrilldownFilters,
    statsOverviewFilters,
  } = statsWorkflow.state;
  const {
    setIsLoadingStats,
    setTradeDrilldownFilters,
    refreshStats,
    applyBootstrapStats,
    setStatsLoadFailure,
  } = statsWorkflow.actions;
  const {
    entryRules,
    isLoadingRules,
    isSavingRule,
    workspaceMode: ruleWorkspaceMode,
  } = ruleWorkflow.state;
  const {
    setIsLoadingRules,
    handleCreateRule,
    handleCreateRuleVersion,
    handleStartCreateRule,
    handleCancelRuleEdit,
    refreshRules,
    applyBootstrapRules,
    setRuleLoadFailure,
  } = ruleWorkflow.actions;
  const tagWorkflow = useTagWorkflow(
    desktopApi,
    trades,
    selectedTradeId,
    syncAfterTagMutation,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDesktopState() {
      const desktopApi = window.desktopApi;
      if (!desktopApi) {
        return;
      }

      setIsLoadingTrades(true);
      setIsLoadingRules(true);
      setIsLoadingStats(true);
      setIsLoadingSettings(true);
      clearBackupSettingsLoadErrors();
      void loadDesktopBackupHistory(desktopApi).then(
        (history) => {
          if (!cancelled) {
            applyBackupHistory(history);
          }
        },
        (error: unknown) => {
          if (!cancelled) {
            setBackupLoadFailure(
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      );
      try {
        const desktopState = await loadDesktopBootstrapState(desktopApi);

        if (!cancelled) {
          setInstruments(desktopState.instruments);
          applyBootstrapTrades(desktopState.trades);
          applyBootstrapRules(desktopState.activeRules);
          applyBootstrapStats(desktopState.statsOverview);
          applyBootstrapState({
            settingsSummary: desktopState.settingsSummary,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setTradeLoadFailure(message);
          setRuleLoadFailure(message);
          setStatsLoadFailure(message);
          setSettingsError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrades(false);
          setIsLoadingRules(false);
          setIsLoadingStats(false);
          setIsLoadingSettings(false);
        }
      }
    }

    void loadDesktopState();

    return () => {
      cancelled = true;
    };
  }, [
    applyBootstrapState,
    applyBackupHistory,
    applyBootstrapTrades,
    applyBootstrapRules,
    clearBackupSettingsLoadErrors,
    applyBootstrapStats,
    setIsLoadingTrades,
    setIsLoadingRules,
    setIsLoadingStats,
    setIsLoadingSettings,
    setSettingsError,
    setBackupLoadFailure,
    setRuleLoadFailure,
    setStatsLoadFailure,
    setTradeLoadFailure,
  ]);

  const handleStatsDrillDown = (filters: StatsOverviewFilters) => {
    setTradeDrilldownFilters(filters);
    setCurrentView("trades");

    const nextTrades = filterTradesForStatsDrilldown(trades, filters);
    setSelectedTradeId(nextTrades[0]?.id ?? null);
    setActiveAttachmentPreviewId(null);
    handleCancelEdit();
    handleCancelRuleCheckEdit();
  };

  const handleDeleteSelectedTrade = async (selectedTrade: TradeSummary) => {
    const deleted = await deleteSelectedTrade(selectedTrade);
    if (deleted) {
      removeTradeAttachments(selectedTrade.id);
      removeReviewForTrade(selectedTrade.id);
    }
  };

  const handleConfirmReview = async (
    selectedTrade: TradeSummary,
    latestReview: AIReview | undefined,
  ) => {
    const review = await confirmReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已确认，这笔交易会纳入统计。");
    }
  };

  const handleCreateReviewDraft = async (selectedTrade: TradeSummary) => {
    const review = await generateReviewDraft(selectedTrade);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("AI 复盘草稿已生成，请核对后确认或修正。");
    }
  };

  const handleCorrectReview = async (
    selectedTrade: TradeSummary,
    latestReview: AIReview | undefined,
  ) => {
    const review = await correctReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已修正，统计会使用修正后的结果。");
    }
  };

  const handleInvalidateReview = async (
    selectedTrade: TradeSummary,
    latestReview: AIReview | undefined,
  ) => {
    const review = await invalidateReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已作废，不会进入统计。");
    }
  };

  const handleSaveRuleCheck = async (
    selectedTrade: TradeSummary,
    checkId: number,
  ) => {
    const saved = await saveRuleCheck(selectedTrade, checkId);
    if (saved) {
      const detail = await desktopApi?.trades.get(selectedTrade.id);
      setSelectedTradeDetailState({ tradeId: selectedTrade.id, detail });
      setFormMessage("规则检查已保存。");
    }
  };

  const syncAfterReviewMutation = async (tradeId: number) => {
    const desktopTrades = await desktopApi?.trades.list();
    if (desktopTrades) {
      setTrades(desktopTrades);
      setSelectedTradeId(tradeId);
    }

    await refreshStats();

    const detail = await desktopApi?.trades.get(tradeId);
    setSelectedTradeDetailState({ tradeId, detail });
  };

  async function syncAfterTagMutation() {
    const desktopTrades = await desktopApi?.trades.list();
    if (desktopTrades) {
      setTrades(desktopTrades);
    }
    await refreshStats();
  }

  const activeView = useMemo(
    () => navigationItems.find((item) => item.id === currentView),
    [currentView],
  );
  const statsPanel = getStatsRuntimePreviewState(
    desktopRuntime,
    statsWorkflow.state.statsOverview,
    trades,
    statsOverviewFilters,
  );
  const statsEntryRuleOptions = useMemo(
    () => createStatsEntryRuleOptions(entryRules, trades),
    [entryRules, trades],
  );
  const visibleTrades = useMemo(
    () =>
      tradeDrilldownFilters
        ? filterTradesForStatsDrilldown(trades, tradeDrilldownFilters)
        : trades,
    [tradeDrilldownFilters, trades],
  );
  const tradeDrilldownLabel = tradeDrilldownFilters
    ? formatStatsDrilldownLabel(
        tradeDrilldownFilters,
        statsEntryRuleOptions,
        statsPanel.overview.byTag,
      )
    : null;
  return (
    <main className="app-shell">
      <AppSidebar
        currentView={currentView}
        desktopRuntime={desktopRuntime}
        onViewChange={setCurrentView}
      />

      <section className="workspace">
        <AppTopbar
          activeView={activeView}
          currentView={currentView}
          isTradeFormOpen={isTradeFormOpen}
          editingTradeId={editingTradeId}
          isSavingTrade={isSavingTrade}
          isLoadingRules={isLoadingRules}
          isSavingRule={isSavingRule}
          ruleWorkspaceMode={ruleWorkspaceMode}
          onSaveTrade={handleCreateClosedTrade}
          onStartCreateTrade={handleStartCreateTrade}
          onCancelEdit={handleCancelEdit}
          onSaveRule={() =>
            void (ruleWorkspaceMode === "create"
              ? handleCreateRule()
              : handleCreateRuleVersion())
          }
          onStartCreateRule={handleStartCreateRule}
          onCancelRuleEdit={handleCancelRuleEdit}
          onRefreshRules={() => void refreshRules()}
        />

        <AppWorkspaceView
          currentView={currentView}
          rules={{
            workflow: ruleWorkflow,
          }}
          stats={{
            runtime: desktopRuntime,
            workflow: statsWorkflow,
            trades,
            instruments,
            entryRules,
            onDrillDown: handleStatsDrillDown,
          }}
          tags={{
            runtime: desktopRuntime,
            workflow: tagWorkflow,
          }}
          backupSettings={{
            runtime: desktopRuntime,
            workflow: backupSettingsWorkflow,
          }}
          tradeDesk={{
            isTradeFormOpen,
            tradeList: {
              workflow: tradeWorkflow,
              trades: visibleTrades,
              activeFilterLabel: tradeDrilldownLabel,
              onClearFilter: () => setTradeDrilldownFilters(null),
              onSelectTrade: (tradeId) => {
                setSelectedTradeId(tradeId);
                setActiveAttachmentPreviewId(null);
                handleCancelRuleCheckEdit();
              },
            },
            tradeForm: {
              workflow: tradeWorkflow,
              entryRules,
              instruments,
            },
            tradeReview: {
              runtime: desktopRuntime,
              trades: visibleTrades,
              tradeWorkflow,
              reviewWorkflow,
              attachmentWorkflow,
              tagWorkflow,
              onDeleteSelectedTrade: (trade) =>
                void handleDeleteSelectedTrade(trade),
              onCreateReviewDraft: (trade) =>
                void handleCreateReviewDraft(trade),
              onConfirmReview: (trade, review) =>
                void handleConfirmReview(trade, review),
              onCorrectReview: (trade, review) =>
                void handleCorrectReview(trade, review),
              onInvalidateReview: (trade, review) =>
                void handleInvalidateReview(trade, review),
              onSaveRuleCheck: (trade, checkId) =>
                void handleSaveRuleCheck(trade, checkId),
            },
          }}
        />
      </section>
    </main>
  );
}

export default App;
