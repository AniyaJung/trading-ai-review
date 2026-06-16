import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { navigationItems, type AppView } from "./app/views";
import {
  getAttachmentPanelState,
} from "./app/attachmentPanel";
import { useAttachmentWorkflow } from "./app/attachmentWorkflow";
import { useTradeWorkflow } from "./app/tradeWorkflow";
import { loadDesktopBootstrapState } from "./app/desktopBootstrap";
import { sampleTrades } from "./app/previewData";
import {
  getSelectedTradeDetail,
  getTradeScopedStateValue,
} from "./app/tradeDetailSelection";
import {
  canSaveRuleCheckEdit,
  getReviewActionState,
  getReviewPanelState,
} from "./app/reviewPanel";
import { useReviewWorkflow } from "./app/reviewWorkflow";
import { useRuleWorkflow } from "./app/ruleWorkflow";
import {
  createStatsEntryRuleOptions,
  filterTradesForStatsDrilldown,
} from "./app/statsPanel";
import {
  getStatsRuntimePreviewState,
  useStatsWorkflow,
} from "./app/statsWorkflow";
import {
  createPreviewTradeDetail,
  formatStatsDrilldownLabel,
} from "./app/previewTrades";
import {
  useBackupSettingsWorkflow,
} from "./app/backupSettingsWorkflow";
import { AppSidebar } from "./components/AppSidebar";
import { AppTopbar } from "./components/AppTopbar";
import { BackupView } from "./components/BackupView";
import { ImagePreviewOverlay } from "./components/ImagePreviewOverlay";
import { RulesView } from "./components/RulesView";
import { SettingsView } from "./components/SettingsView";
import { StatsView } from "./components/StatsView";
import { TradeFormPanel } from "./components/TradeFormPanel";
import { TradeListPanel } from "./components/TradeListPanel";
import { TradeReviewPanel } from "./components/TradeReviewPanel";

function App() {
  const [currentView, setCurrentView] = useState<AppView>("trades");
  const desktopApi = window.desktopApi;
  const desktopRuntime = desktopApi?.runtime ?? "browser-preview";
  const backupSettingsWorkflow = useBackupSettingsWorkflow(desktopApi);
  const attachmentWorkflow = useAttachmentWorkflow(desktopApi);
  const reviewWorkflow = useReviewWorkflow(desktopApi);
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<string>(
    "等待桌面数据服务",
  );
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
    isBackupBusy,
    backupError,
    lastBackup,
    lastRestore,
    backupHistory,
    settingsSummary,
    settingsDraft,
    dataResetDraft,
    isLoadingSettings,
    isSavingSettings,
    isResettingLocalData,
    settingsError,
    settingsMessage,
  } = backupSettingsWorkflow.state;
  const {
    applyBootstrapState,
    clearLoadErrors: clearBackupSettingsLoadErrors,
    setIsLoadingSettings,
    setSettingsError,
    setSettingsDraft,
    setDataResetDraft,
    handleCreateBackup,
    handleRestoreBackup,
    handleRestoreBackupFile,
    handleOpenDataDirectory,
    handleOpenBackupsDirectory,
    handleSaveAISettings,
    handleOpenSettingsDataDirectory,
    handleOpenSettingsBackupsDirectory,
    handleResetLocalData,
  } = backupSettingsWorkflow.actions;
  const {
    attachmentsByTradeId,
    attachmentDraft,
    loadingAttachmentTradeId,
    attachmentErrorState,
    isSavingAttachment,
    deletingAttachmentId,
    attachmentImageDataUrls,
    activeAttachmentPreviewId,
  } = attachmentWorkflow.state;
  const {
    setAttachmentDraft,
    setActiveAttachmentPreviewId,
    removeTradeAttachments,
    refreshAttachmentsForTrade,
    handleChooseAndAttach,
    handleDeleteAttachment,
  } = attachmentWorkflow.actions;
  const {
    latestReviewByTradeId,
    loadingReviewTradeId,
    reviewErrorState,
    isSavingReview,
    editingRuleCheckId,
    ruleCheckEditDraft,
    savingRuleCheckId,
  } = reviewWorkflow.state;
  const {
    loadLatestReviewForTrade,
    handleConfirmReview: confirmReview,
    handleCreateReviewDraft: generateReviewDraft,
    handleCorrectReview: correctReview,
    handleInvalidateReview: invalidateReview,
    handleStartRuleCheckEdit,
    handleCancelRuleCheckEdit,
    setRuleCheckEditDraft: handleRuleCheckDraftChange,
    handleSaveRuleCheck: saveRuleCheck,
    removeReviewForTrade,
  } = reviewWorkflow.actions;
  const {
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
  } = tradeWorkflow.state;
  const {
    setTrades,
    setTradeForm,
    setIsLoadingTrades,
    setSelectedTradeId,
    setSelectedTradeDetailState,
    setFormMessage,
    updateTradeForm,
    loadTradeDetail,
    handleCreateClosedTrade,
    handleDeleteSelectedTrade: deleteSelectedTrade,
    handleEditSelectedTrade,
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
    isLoadingStats,
    statsError,
    statsFilters,
    tradeDrilldownFilters,
    statsOverviewFilters,
  } = statsWorkflow.state;
  const {
    setIsLoadingStats,
    setTradeDrilldownFilters,
    refreshStats,
    handleStatsFiltersChange,
    applyBootstrapStats,
    setStatsLoadFailure,
  } = statsWorkflow.actions;
  const {
    entryRules,
    isLoadingRules,
    ruleMessage,
    ruleErrors,
    ruleDraft,
    versionDraft,
    isSavingRule,
  } = ruleWorkflow.state;
  const {
    setIsLoadingRules,
    setRuleDraft,
    setVersionDraft,
    refreshRules,
    handleCreateRule,
    handleCreateRuleVersion,
    handleArchiveRule,
    applyBootstrapRules,
    setRuleLoadFailure,
  } = ruleWorkflow.actions;

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
      try {
        const desktopState = await loadDesktopBootstrapState(desktopApi);

        if (!cancelled) {
          setDatabaseStatus(desktopState.databaseStatus);
          setInstruments(desktopState.instruments);
          applyBootstrapTrades(desktopState.trades);
          applyBootstrapRules(desktopState.activeRules);
          applyBootstrapStats(desktopState.statsOverview);
          applyBootstrapState({
            settingsSummary: desktopState.settingsSummary,
            backupHistory: desktopState.backupHistory,
          });
          clearBackupSettingsLoadErrors();
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
    applyBootstrapTrades,
    applyBootstrapRules,
    clearBackupSettingsLoadErrors,
    applyBootstrapStats,
    setIsLoadingTrades,
    setIsLoadingRules,
    setIsLoadingStats,
    setIsLoadingSettings,
    setSettingsError,
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
    handleCancelRuleCheckEdit();
  };

  const handleDeleteSelectedTrade = async () => {
    const deleted = await deleteSelectedTrade(selectedTrade);
    if (deleted && selectedTrade) {
      removeTradeAttachments(selectedTrade.id);
      removeReviewForTrade(selectedTrade.id);
    }
  };

  const handleConfirmReview = async () => {
    if (!selectedTrade) {
      return;
    }

    const review = await confirmReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已确认，这笔交易会纳入统计。");
    }
  };

  const handleCreateReviewDraft = async () => {
    if (!selectedTrade) {
      return;
    }

    const review = await generateReviewDraft(selectedTrade);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("AI 复盘草稿已生成，请核对后确认或修正。");
    }
  };

  const handleCorrectReview = async () => {
    if (!selectedTrade) {
      return;
    }

    const review = await correctReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已修正，统计会使用修正后的结果。");
    }
  };

  const handleInvalidateReview = async () => {
    if (!selectedTrade) {
      return;
    }

    const review = await invalidateReview(selectedTrade, latestReview);
    if (review) {
      await syncAfterReviewMutation(selectedTrade.id);
      setFormMessage("复盘已作废，不会进入统计。");
    }
  };

  const handleSaveRuleCheck = async (checkId: number) => {
    if (!selectedTrade) {
      return;
    }

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
  const statsInstrumentOptions = useMemo(() => {
    if (instruments.length > 0) {
      return instruments;
    }

    const previewInstruments = new Map<string, InstrumentConfig>();
    for (const trade of trades) {
      previewInstruments.set(trade.symbol, {
        symbol: trade.symbol,
        name: trade.instrumentName,
        assetClass: "futures",
        exchange: "CME",
        currency: "USD",
        tickSize: 0.25,
        tickValue: 0,
        pointValue: 0,
      });
    }
    return [...previewInstruments.values()];
  }, [instruments, trades]);
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
  const selectedTrade =
    visibleTrades.find((trade) => trade.id === selectedTradeId) ??
    visibleTrades[0];
  const reviewPanel = getReviewPanelState(selectedTrade);
  const latestReview = selectedTrade
    ? latestReviewByTradeId[selectedTrade.id]
    : undefined;
  const reviewAction = getReviewActionState({
    trade: selectedTrade,
    latestReview,
    hasDesktopRuntime: Boolean(window.desktopApi),
    isSavingReview,
  });
  const canSaveRuleCheck = canSaveRuleCheckEdit({
    selectedTrade,
    hasDesktopRuntime: Boolean(window.desktopApi),
    isSavingRuleCheck: savingRuleCheckId != null,
  });
  const previewTradeDetail =
    selectedTrade && !window.desktopApi
      ? createPreviewTradeDetail(selectedTrade)
      : undefined;
  const selectedTradeDetail = getSelectedTradeDetail({
    previewTradeDetail,
    selectedTrade,
    selectedTradeDetailState,
  });
  const isLoadingTradeDetail = loadingTradeDetailId === selectedTrade?.id;
  const tradeDetailError =
    getTradeScopedStateValue({
      selectedTrade,
      state: tradeDetailErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const attachmentPanel = getAttachmentPanelState(
    selectedTrade ? (attachmentsByTradeId[selectedTrade.id] ?? []) : [],
  );
  const isLoadingAttachments = loadingAttachmentTradeId === selectedTrade?.id;
  const attachmentError =
    getTradeScopedStateValue({
      selectedTrade,
      state: attachmentErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const isLoadingReview = loadingReviewTradeId === selectedTrade?.id;
  const reviewError =
    getTradeScopedStateValue({
      selectedTrade,
      state: reviewErrorState,
      readValue: (state) => state.error,
    }) ?? null;
  const activeAttachmentPreview =
    activeAttachmentPreviewId == null
      ? undefined
      : attachmentPanel.items.find(
          (attachment) => attachment.id === activeAttachmentPreviewId,
        );
  const activeAttachmentPreviewDataUrl =
    activeAttachmentPreviewId == null
      ? undefined
      : attachmentImageDataUrls[activeAttachmentPreviewId];

  useEffect(() => {
    if (!selectedTrade || !desktopApi) {
      return;
    }

    void loadTradeDetail(selectedTrade.id);
  }, [desktopApi, loadTradeDetail, selectedTrade]);

  useEffect(() => {
    if (!selectedTrade || !desktopApi) {
      return;
    }

    void loadLatestReviewForTrade(selectedTrade.id);
  }, [desktopApi, loadLatestReviewForTrade, selectedTrade]);

  useEffect(() => {
    if (!selectedTrade || !desktopApi) {
      return;
    }

    void refreshAttachmentsForTrade(selectedTrade.id);
  }, [desktopApi, refreshAttachmentsForTrade, selectedTrade]);

  return (
    <main className="app-shell">
      <AppSidebar
        currentView={currentView}
        desktopRuntime={desktopRuntime}
        databaseStatus={databaseStatus}
        onViewChange={setCurrentView}
      />

      <section className="workspace">
        <AppTopbar
          activeView={activeView}
          currentView={currentView}
          editingTradeId={editingTradeId}
          isSavingTrade={isSavingTrade}
          isLoadingRules={isLoadingRules}
          onSaveTrade={handleCreateClosedTrade}
          onCancelEdit={handleCancelEdit}
          onRefreshRules={() => void refreshRules()}
        />

        {currentView === "rules" ? (
          <RulesView
            entryRules={entryRules}
            isLoadingRules={isLoadingRules}
            isSavingRule={isSavingRule}
            ruleDraft={ruleDraft}
            versionDraft={versionDraft}
            ruleErrors={ruleErrors}
            ruleMessage={ruleMessage}
            onRuleDraftChange={setRuleDraft}
            onVersionDraftChange={setVersionDraft}
            onCreateRule={() => void handleCreateRule()}
            onCreateRuleVersion={() => void handleCreateRuleVersion()}
            onArchiveRule={(rule) => void handleArchiveRule(rule)}
          />
        ) : currentView === "stats" ? (
          <StatsView
            overview={statsPanel.overview}
            isLoading={isLoadingStats}
            error={statsError}
            isPreview={statsPanel.isPreview}
            filters={statsFilters}
            instruments={statsInstrumentOptions}
            entryRuleOptions={statsEntryRuleOptions}
            onFiltersChange={handleStatsFiltersChange}
            onDrillDown={handleStatsDrillDown}
            onRefresh={() => void refreshStats()}
          />
        ) : currentView === "backup" ? (
          <BackupView
            runtime={desktopRuntime}
            isBusy={isBackupBusy}
            error={backupError}
            lastBackup={lastBackup}
            lastRestore={lastRestore}
            backupHistory={backupHistory}
            onCreateBackup={() => void handleCreateBackup()}
            onRestoreBackup={() => void handleRestoreBackup()}
            onRestoreBackupFile={(filePath) => void handleRestoreBackupFile(filePath)}
            onOpenDataDirectory={() => void handleOpenDataDirectory()}
            onOpenBackupsDirectory={() => void handleOpenBackupsDirectory()}
          />
        ) : currentView === "settings" ? (
          <SettingsView
            runtime={desktopRuntime}
            summary={settingsSummary}
            draft={settingsDraft}
            dataResetDraft={dataResetDraft}
            isLoading={isLoadingSettings}
            isSaving={isSavingSettings}
            isResettingLocalData={isResettingLocalData}
            error={settingsError}
            message={settingsMessage}
            onDraftChange={setSettingsDraft}
            onDataResetDraftChange={setDataResetDraft}
            onSaveAI={() => void handleSaveAISettings()}
            onResetLocalData={() => void handleResetLocalData()}
            onOpenDataDirectory={() => void handleOpenSettingsDataDirectory()}
            onOpenBackupsDirectory={() =>
              void handleOpenSettingsBackupsDirectory()
            }
          />
        ) : (
        <section className="desk-grid">
          <TradeListPanel
            trades={visibleTrades}
            selectedTradeId={selectedTrade?.id}
            isLoadingTrades={isLoadingTrades}
            tradeLoadError={tradeLoadError}
            activeFilterLabel={tradeDrilldownLabel}
            onClearFilter={() => setTradeDrilldownFilters(null)}
            onSelectTrade={(tradeId) => {
              setSelectedTradeId(tradeId);
              setActiveAttachmentPreviewId(null);
              handleCancelRuleCheckEdit();
            }}
          />

          <TradeFormPanel
            tradeForm={tradeForm}
            entryRules={entryRules}
            instruments={instruments}
            formPreview={formPreview}
            formErrors={formErrors}
            formMessage={formMessage}
            editingTradeId={editingTradeId}
            onChange={updateTradeForm}
          />

          <TradeReviewPanel
            reviewPanel={reviewPanel}
            reviewAction={reviewAction}
            latestReview={latestReview}
            selectedTrade={selectedTrade}
            selectedTradeDetail={selectedTradeDetail}
            isLoadingTradeDetail={isLoadingTradeDetail}
            tradeDetailError={tradeDetailError}
            isLoadingReview={isLoadingReview}
            reviewError={reviewError}
            isSavingReview={isSavingReview}
            isDeletingTrade={isDeletingTrade}
            editingRuleCheckId={editingRuleCheckId}
            ruleCheckEditDraft={ruleCheckEditDraft}
            canSaveRuleCheck={canSaveRuleCheck}
            savingRuleCheckId={savingRuleCheckId}
            attachmentPanel={attachmentPanel}
            attachmentDraft={attachmentDraft}
            isLoadingAttachments={isLoadingAttachments}
            attachmentError={attachmentError}
            isSavingAttachment={isSavingAttachment}
            deletingAttachmentId={deletingAttachmentId}
            attachmentImageDataUrls={attachmentImageDataUrls}
            onEditSelectedTrade={() => handleEditSelectedTrade(selectedTradeDetail)}
            onDeleteSelectedTrade={handleDeleteSelectedTrade}
            onCreateReviewDraft={() => void handleCreateReviewDraft()}
            onConfirmReview={() => void handleConfirmReview()}
            onCorrectReview={() => void handleCorrectReview()}
            onInvalidateReview={() => void handleInvalidateReview()}
            onStartRuleCheckEdit={handleStartRuleCheckEdit}
            onRuleCheckDraftChange={handleRuleCheckDraftChange}
            onCancelRuleCheckEdit={handleCancelRuleCheckEdit}
            onSaveRuleCheck={(checkId) => void handleSaveRuleCheck(checkId)}
            onAttachmentDraftChange={setAttachmentDraft}
            onChooseAndAttach={() => void handleChooseAndAttach(selectedTrade)}
            onDeleteAttachment={(attachmentId) =>
              void handleDeleteAttachment(selectedTrade, attachmentId)
            }
            onPreviewAttachment={setActiveAttachmentPreviewId}
          />
        </section>
        )}
      </section>

      {activeAttachmentPreview && activeAttachmentPreviewDataUrl ? (
        <ImagePreviewOverlay
          attachment={activeAttachmentPreview}
          imageDataUrl={activeAttachmentPreviewDataUrl}
          onClose={() => setActiveAttachmentPreviewId(null)}
        />
      ) : null}
    </main>
  );
}

export default App;
