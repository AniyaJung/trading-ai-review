import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import "./App.css";
import { navigationItems, type AppView } from "./app/views";
import {
  getAttachmentPanelState,
  type AttachmentImageType,
  type AttachmentSummary,
} from "./app/attachmentPanel";
import {
  buildCreateClosedTradeInput,
  calculateTradeFormPreview,
  createInitialTradeForm,
  createTradeFormFromDetail,
  createTradeFormAfterSave,
  type TradeFormState,
} from "./app/tradeForm";
import { getInitialTrades } from "./app/tradeList";
import {
  getSelectedTradeDetail,
  getTradeScopedStateValue,
} from "./app/tradeDetailSelection";
import { getReviewActionState, getReviewPanelState } from "./app/reviewPanel";
import { parseChecklistText } from "./app/rulePanel";
import { AppSidebar } from "./components/AppSidebar";
import { AppTopbar } from "./components/AppTopbar";
import { RulesView } from "./components/RulesView";
import { TradeFormPanel } from "./components/TradeFormPanel";
import { TradeListPanel } from "./components/TradeListPanel";
import { TradeReviewPanel } from "./components/TradeReviewPanel";

const sampleTrades: TradeSummary[] = [
  {
    id: 1,
    symbol: "ES",
    instrumentName: "E-mini S&P 500",
    direction: "long",
    status: "closed",
    openedAt: "2026-06-08T14:41:00.000Z",
    closedAt: "2026-06-08T15:20:00.000Z",
    entryPriceAvg: 5300,
    exitPriceAvg: 5304.5,
    quantity: 2,
    feesTotal: 5,
    grossPnl: 450,
    netPnl: 445,
    riskAmount: 200,
    rMultiple: 2.225,
    entryRuleId: null,
    entryRuleVersionId: null,
    entryRuleName: null,
    entryRuleVersionNo: null,
    aiReviewStatus: "needs_review",
  },
  {
    id: 2,
    symbol: "MNQ",
    instrumentName: "Micro E-mini Nasdaq-100",
    direction: "short",
    status: "closed",
    openedAt: "2026-06-07T15:18:00.000Z",
    closedAt: "2026-06-07T16:02:00.000Z",
    entryPriceAvg: 19000,
    exitPriceAvg: 18984,
    quantity: 3,
    feesTotal: 3.6,
    grossPnl: 96,
    netPnl: 92.4,
    riskAmount: 48,
    rMultiple: 1.925,
    entryRuleId: null,
    entryRuleVersionId: null,
    entryRuleName: null,
    entryRuleVersionNo: null,
    aiReviewStatus: "confirmed",
  },
  {
    id: 3,
    symbol: "MES",
    instrumentName: "Micro E-mini S&P 500",
    direction: "long",
    status: "closed",
    openedAt: "2026-06-06T13:57:00.000Z",
    closedAt: "2026-06-06T14:22:00.000Z",
    entryPriceAvg: 5291.25,
    exitPriceAvg: 5288.25,
    quantity: 1,
    feesTotal: 1.5,
    grossPnl: -15,
    netPnl: -16.5,
    riskAmount: 12.5,
    rMultiple: -1.32,
    entryRuleId: null,
    entryRuleVersionId: null,
    entryRuleName: null,
    entryRuleVersionNo: null,
    aiReviewStatus: "corrected",
  },
];

function App() {
  const [currentView, setCurrentView] = useState<AppView>("trades");
  const desktopRuntime = window.desktopApi?.runtime ?? "browser-preview";
  const [trades, setTrades] = useState<TradeSummary[]>(() =>
    getInitialTrades(desktopRuntime, sampleTrades),
  );
  const [tradeForm, setTradeForm] = useState<TradeFormState>(() =>
    createInitialTradeForm(),
  );
  const [entryRules, setEntryRules] = useState<EntryRuleWithLatestVersion[]>([]);
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [ruleMessage, setRuleMessage] = useState(
    "创建入场规则后，交易录入时可以绑定具体版本。",
  );
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState({
    name: "",
    marketType: "index_futures",
    description: "",
    content: "",
    checklistText: "",
  });
  const [versionDraft, setVersionDraft] = useState({
    entryRuleId: "",
    content: "",
    checklistText: "",
  });
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [formMessage, setFormMessage] = useState<string>(
    "录入已平仓交易后会立即写入本地 SQLite。",
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [isDeletingTrade, setIsDeletingTrade] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeLoadError, setTradeLoadError] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [selectedTradeDetailState, setSelectedTradeDetailState] = useState<{
    tradeId: number;
    detail: TradeDetail | undefined;
  }>();
  const [loadingTradeDetailId, setLoadingTradeDetailId] = useState<number | null>(
    null,
  );
  const [tradeDetailErrorState, setTradeDetailErrorState] = useState<{
    tradeId: number;
    error: string;
  }>();
  const [attachmentsByTradeId, setAttachmentsByTradeId] = useState<
    Record<number, AttachmentSummary[]>
  >({});
  const [attachmentDraft, setAttachmentDraft] = useState<{
    imageType: AttachmentImageType;
    caption: string;
  }>({
    imageType: "entry",
    caption: "",
  });
  const [loadingAttachmentTradeId, setLoadingAttachmentTradeId] = useState<
    number | null
  >(null);
  const [attachmentErrorState, setAttachmentErrorState] = useState<{
    tradeId: number;
    error: string;
  }>();
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(
    null,
  );
  const [attachmentImageDataUrls, setAttachmentImageDataUrls] = useState<
    Record<number, string>
  >({});
  const [activeAttachmentPreviewId, setActiveAttachmentPreviewId] = useState<
    number | null
  >(null);
  const [latestReviewByTradeId, setLatestReviewByTradeId] = useState<
    Record<number, AIReview | undefined>
  >({});
  const [loadingReviewTradeId, setLoadingReviewTradeId] = useState<number | null>(
    null,
  );
  const [reviewErrorState, setReviewErrorState] = useState<{
    tradeId: number;
    error: string;
  }>();
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<string>(
    "数据库等待桌面运行时",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDesktopState() {
      if (!window.desktopApi) {
        return;
      }

      setIsLoadingTrades(true);
      setIsLoadingRules(true);
      try {
        const [status, desktopTrades, activeRules, instrumentConfigs] =
          await Promise.all([
            window.desktopApi.database.getStatus(),
            window.desktopApi.trades.list(),
            window.desktopApi.rules.listActive(),
            window.desktopApi.database.listInstruments(),
          ]);

        if (!cancelled) {
          setDatabaseStatus(
            `SQLite v${status.migrationVersion} / ${status.instrumentCount} 个品种`,
          );
          setInstruments(instrumentConfigs);
          setTrades(desktopTrades);
          setEntryRules(activeRules);
          setSelectedTradeId((current) => current ?? desktopTrades[0]?.id ?? null);
          setTradeLoadError(null);
          setRuleErrors([]);
        }
      } catch (error) {
        if (!cancelled) {
          setTradeLoadError(
            error instanceof Error ? error.message : String(error),
          );
          setRuleErrors([error instanceof Error ? error.message : String(error)]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrades(false);
          setIsLoadingRules(false);
        }
      }
    }

    void loadDesktopState();

    return () => {
      cancelled = true;
    };
  }, []);

  const formPreview = useMemo(() => {
    return calculateTradeFormPreview(tradeForm, instruments);
  }, [tradeForm, instruments]);

  const updateTradeForm = (field: keyof TradeFormState, value: string) => {
    setTradeForm((current) => ({ ...current, [field]: value }));
    setFormErrors([]);
  };

  const refreshRules = async () => {
    if (!window.desktopApi) {
      return;
    }

    setIsLoadingRules(true);
    try {
      const activeRules = await window.desktopApi.rules.listActive();
      setEntryRules(activeRules);
      setRuleErrors([]);
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleCreateRule = async () => {
    setRuleErrors([]);

    if (!window.desktopApi) {
      setRuleErrors(["浏览器预览不会写入规则库；请在 Electron 桌面运行时操作。"]);
      return;
    }

    if (!ruleDraft.name.trim() || !ruleDraft.content.trim()) {
      setRuleErrors(["请填写规则名称和版本内容。"]);
      return;
    }

    setIsSavingRule(true);
    try {
      const created = await window.desktopApi.rules.create({
        name: ruleDraft.name,
        description: ruleDraft.description || null,
        marketType: ruleDraft.marketType || null,
        content: ruleDraft.content,
        checklist: parseChecklistText(ruleDraft.checklistText),
      });
      setRuleDraft({
        name: "",
        marketType: "index_futures",
        description: "",
        content: "",
        checklistText: "",
      });
      setVersionDraft((current) => ({
        ...current,
        entryRuleId: String(created.id),
      }));
      setTradeForm((current) => ({
        ...current,
        entryRuleVersionId: String(created.latestVersion.id),
      }));
      await refreshRules();
      setRuleMessage("规则已创建，交易表单已选中新规则版本。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleCreateRuleVersion = async () => {
    setRuleErrors([]);

    if (!window.desktopApi) {
      setRuleErrors(["浏览器预览不会写入规则库；请在 Electron 桌面运行时操作。"]);
      return;
    }

    const entryRuleId = Number(versionDraft.entryRuleId);

    if (!Number.isInteger(entryRuleId) || entryRuleId <= 0) {
      setRuleErrors(["请选择要追加版本的规则。"]);
      return;
    }

    if (!versionDraft.content.trim()) {
      setRuleErrors(["请填写新版本内容。"]);
      return;
    }

    setIsSavingRule(true);
    try {
      const version = await window.desktopApi.rules.createVersion({
        entryRuleId,
        content: versionDraft.content,
        checklist: parseChecklistText(versionDraft.checklistText),
      });
      setVersionDraft((current) => ({
        ...current,
        content: "",
        checklistText: "",
      }));
      setTradeForm((current) => ({
        ...current,
        entryRuleVersionId: String(version.id),
      }));
      await refreshRules();
      setRuleMessage("规则新版本已创建，交易表单已选中新版本。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleArchiveRule = async (rule: EntryRuleWithLatestVersion) => {
    const confirmed = window.confirm(`归档规则 ${rule.name}？历史交易绑定不会被删除。`);

    if (!confirmed) {
      return;
    }

    if (!window.desktopApi) {
      setRuleErrors(["浏览器预览不会写入规则库；请在 Electron 桌面运行时操作。"]);
      return;
    }

    setIsSavingRule(true);
    try {
      await window.desktopApi.rules.archive(rule.id);
      await refreshRules();
      setTradeForm((current) =>
        current.entryRuleVersionId === String(rule.latestVersion.id)
          ? { ...current, entryRuleVersionId: "" }
          : current,
      );
      setRuleMessage("规则已归档，历史交易仍保留原版本绑定。");
    } catch (error) {
      setRuleErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleCreateClosedTrade = async () => {
    setFormErrors([]);
    const result = buildCreateClosedTradeInput(tradeForm);

    if (!result.ok) {
      setFormErrors(result.errors);
      setFormMessage("请修正交易事实后再保存。");
      return;
    }

    if (editingTradeId != null) {
      setIsSavingTrade(true);
      try {
        if (window.desktopApi) {
          const updatedTrade = await window.desktopApi.trades.update(
            editingTradeId,
            result.input,
          );

          if (!updatedTrade) {
            throw new Error("交易不存在，无法更新。");
          }

          setTrades(await window.desktopApi.trades.list());
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
        setFormMessage("交易已更新，并重新计算盈亏和成交明细。");
      } catch (error) {
        setFormErrors([error instanceof Error ? error.message : String(error)]);
      } finally {
        setIsSavingTrade(false);
      }
      return;
    }

    if (!window.desktopApi) {
      setFormMessage("浏览器预览不会写入数据库；Electron 运行时会保存。");
      setTrades(sampleTrades);
      return;
    }

    setIsSavingTrade(true);
    try {
      const createdTrade = await window.desktopApi.trades.createClosed(
        result.input,
      );
      setTrades(await window.desktopApi.trades.list());
      setSelectedTradeId(createdTrade.id);
      setTradeForm(createTradeFormAfterSave(tradeForm));
      setFormMessage("交易已保存，并自动生成 entry/exit 成交明细。");
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const handleDeleteSelectedTrade = async () => {
    if (!selectedTrade) {
      return;
    }

    const confirmed = window.confirm(
      `删除 ${selectedTrade.symbol} ${formatTradeTime(
        selectedTrade.openedAt,
      )} 这笔交易？成交明细和后续复盘也会一并删除。`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingTrade(true);
    try {
      if (window.desktopApi) {
        await window.desktopApi.trades.delete(selectedTrade.id);
        const nextTrades = await window.desktopApi.trades.list();
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      } else {
        const nextTrades = trades.filter((trade) => trade.id !== selectedTrade.id);
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      }
      setSelectedTradeDetailState(undefined);
      setTradeDetailErrorState(undefined);
      setAttachmentsByTradeId((current) => {
        const next = { ...current };
        delete next[selectedTrade.id];
        return next;
      });
      setLatestReviewByTradeId((current) => {
        const next = { ...current };
        delete next[selectedTrade.id];
        return next;
      });
      setEditingTradeId(null);
      setFormMessage("交易已删除。");
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsDeletingTrade(false);
    }
  };

  const handleConfirmReview = async () => {
    if (!selectedTrade || !latestReview || !window.desktopApi) {
      return;
    }

    setIsSavingReview(true);
    try {
      const review = await window.desktopApi.reviews.confirm(latestReview.id);
      await applyReviewMutation(selectedTrade.id, review);
      setFormMessage("复盘草稿已确认，后续统计会纳入该交易。");
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleCorrectReview = async () => {
    if (!selectedTrade || !latestReview || !window.desktopApi) {
      return;
    }

    const summary = window.prompt(
      "修正后的复盘摘要",
      latestReview.summary ?? "",
    );

    if (summary == null) {
      return;
    }

    setIsSavingReview(true);
    try {
      const review = await window.desktopApi.reviews.correct(latestReview.id, {
        summary: summary.trim() || latestReview.summary,
      });
      await applyReviewMutation(selectedTrade.id, review);
      setFormMessage("复盘草稿已修正，后续统计会使用修正结果。");
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleInvalidateReview = async () => {
    if (!selectedTrade || !latestReview || !window.desktopApi) {
      return;
    }

    const confirmed = window.confirm("将这条复盘草稿标记为无效？该交易不会进入复盘统计口径。");

    if (!confirmed) {
      return;
    }

    setIsSavingReview(true);
    try {
      const review = await window.desktopApi.reviews.invalidate(latestReview.id);
      await applyReviewMutation(selectedTrade.id, review);
      setFormMessage("复盘草稿已标记无效。");
    } catch (error) {
      setReviewErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const applyReviewMutation = async (tradeId: number, review: AIReview) => {
    setLatestReviewByTradeId((current) => ({
      ...current,
      [tradeId]: review,
    }));
    setReviewErrorState(undefined);

    const desktopTrades = await window.desktopApi?.trades.list();
    if (desktopTrades) {
      setTrades(desktopTrades);
      setSelectedTradeId(tradeId);
    }

    const detail = await window.desktopApi?.trades.get(tradeId);
    setSelectedTradeDetailState({ tradeId, detail });
  };

  const handleEditSelectedTrade = () => {
    if (!selectedTradeDetail) {
      return;
    }

    setEditingTradeId(selectedTradeDetail.id);
    setTradeForm(createTradeFormFromDetail(selectedTradeDetail));
    setFormErrors([]);
    setFormMessage("正在编辑选中交易，保存后会覆盖原记录。");
  };

  const handleCancelEdit = () => {
    setEditingTradeId(null);
    setTradeForm(createInitialTradeForm());
    setFormErrors([]);
    setFormMessage("已取消编辑。");
  };

  const refreshAttachmentsForTrade = async (tradeId: number) => {
    if (!window.desktopApi) {
      return;
    }

    setLoadingAttachmentTradeId(tradeId);
    try {
      const attachments = await window.desktopApi.attachments.listByTrade(tradeId);
      setAttachmentsByTradeId((current) => ({
        ...current,
        [tradeId]: attachments,
      }));
      await loadAttachmentImageDataUrls(attachments);
      setAttachmentErrorState(undefined);
    } catch (error) {
      setAttachmentErrorState({
        tradeId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingAttachmentTradeId((current) =>
        current === tradeId ? null : current,
      );
    }
  };

  const loadAttachmentImageDataUrls = async (attachments: AttachmentSummary[]) => {
    if (!window.desktopApi || attachments.length === 0) {
      return;
    }

    const entries = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          const dataUrl =
            await window.desktopApi?.attachments.readImageDataUrl(attachment.id);
          return dataUrl ? ([attachment.id, dataUrl] as const) : undefined;
        } catch {
          return undefined;
        }
      }),
    );
    const imageDataUrls = Object.fromEntries(
      entries.filter((entry): entry is readonly [number, string] =>
        Boolean(entry),
      ),
    );

    setAttachmentImageDataUrls((current) => ({
      ...current,
      ...imageDataUrls,
    }));
  };

  const handleChooseAndAttach = async () => {
    if (!selectedTrade) {
      return;
    }

    if (!window.desktopApi) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: "浏览器预览不能选择本地文件；请在 Electron 桌面运行时添加截图。",
      });
      return;
    }

    setIsSavingAttachment(true);
    try {
      const attachment = await window.desktopApi.attachments.chooseAndAttach({
        tradeId: selectedTrade.id,
        imageType: attachmentDraft.imageType,
        caption: attachmentDraft.caption.trim() || null,
        sortOrder: attachmentsByTradeId[selectedTrade.id]?.length ?? 0,
      });
      if (!attachment) {
        return;
      }
      setAttachmentDraft((current) => ({
        ...current,
        caption: "",
      }));
      await refreshAttachmentsForTrade(selectedTrade.id);
    } catch (error) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSavingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!selectedTrade) {
      return;
    }

    const confirmed = window.confirm("删除这张交易截图？本地副本也会移除。");
    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    try {
      if (window.desktopApi) {
        await window.desktopApi.attachments.delete(attachmentId);
        await refreshAttachmentsForTrade(selectedTrade.id);
        setAttachmentImageDataUrls((current) => {
          const next = { ...current };
          delete next[attachmentId];
          return next;
        });
        setActiveAttachmentPreviewId((current) =>
          current === attachmentId ? null : current,
        );
      } else {
        setAttachmentsByTradeId((current) => ({
          ...current,
          [selectedTrade.id]: (current[selectedTrade.id] ?? []).filter(
            (attachment) => attachment.id !== attachmentId,
          ),
        }));
      }
    } catch (error) {
      setAttachmentErrorState({
        tradeId: selectedTrade.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const activeView = useMemo(
    () => navigationItems.find((item) => item.id === currentView),
    [currentView],
  );
  const selectedTrade =
    trades.find((trade) => trade.id === selectedTradeId) ?? trades[0];
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
    let cancelled = false;

    if (!selectedTrade || !window.desktopApi) {
      return;
    }

    void Promise.resolve()
      .then(() => {
        setLoadingTradeDetailId(selectedTrade.id);
        return window.desktopApi?.trades.get(selectedTrade.id);
      })
      .then((detail) => {
        if (!cancelled) {
          setSelectedTradeDetailState({ tradeId: selectedTrade.id, detail });
          setTradeDetailErrorState(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTradeDetailErrorState({
            tradeId: selectedTrade.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTradeDetailId((current) =>
            current === selectedTrade.id ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrade]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedTrade || !window.desktopApi) {
      return;
    }

    void Promise.resolve()
      .then(() => {
        setLoadingReviewTradeId(selectedTrade.id);
        return window.desktopApi?.reviews.getLatestForTrade(selectedTrade.id);
      })
      .then((review) => {
        if (!cancelled) {
          setLatestReviewByTradeId((current) => ({
            ...current,
            [selectedTrade.id]: review,
          }));
          setReviewErrorState(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setReviewErrorState({
            tradeId: selectedTrade.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingReviewTradeId((current) =>
            current === selectedTrade.id ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrade]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedTrade || !window.desktopApi) {
      return;
    }

    void Promise.resolve()
      .then(() => {
        setLoadingAttachmentTradeId(selectedTrade.id);
        return window.desktopApi?.attachments.listByTrade(selectedTrade.id);
      })
      .then((attachments) => {
        if (!cancelled) {
          setAttachmentsByTradeId((current) => ({
            ...current,
            [selectedTrade.id]: attachments ?? [],
          }));
          void loadAttachmentImageDataUrls(attachments ?? []);
          setAttachmentErrorState(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAttachmentErrorState({
            tradeId: selectedTrade.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttachmentTradeId((current) =>
            current === selectedTrade.id ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrade]);

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
        ) : (
        <section className="desk-grid">
          <TradeListPanel
            trades={trades}
            selectedTradeId={selectedTrade?.id}
            isLoadingTrades={isLoadingTrades}
            tradeLoadError={tradeLoadError}
            onSelectTrade={(tradeId) => {
              setSelectedTradeId(tradeId);
              setActiveAttachmentPreviewId(null);
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
            attachmentPanel={attachmentPanel}
            attachmentDraft={attachmentDraft}
            isLoadingAttachments={isLoadingAttachments}
            attachmentError={attachmentError}
            isSavingAttachment={isSavingAttachment}
            deletingAttachmentId={deletingAttachmentId}
            attachmentImageDataUrls={attachmentImageDataUrls}
            onEditSelectedTrade={handleEditSelectedTrade}
            onDeleteSelectedTrade={handleDeleteSelectedTrade}
            onConfirmReview={() => void handleConfirmReview()}
            onCorrectReview={() => void handleCorrectReview()}
            onInvalidateReview={() => void handleInvalidateReview()}
            onAttachmentDraftChange={setAttachmentDraft}
            onChooseAndAttach={() => void handleChooseAndAttach()}
            onDeleteAttachment={(attachmentId) =>
              void handleDeleteAttachment(attachmentId)
            }
            onPreviewAttachment={setActiveAttachmentPreviewId}
          />
        </section>
        )}
      </section>

      {activeAttachmentPreview && activeAttachmentPreviewDataUrl ? (
        <div
          className="image-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="交易截图预览"
          onClick={() => setActiveAttachmentPreviewId(null)}
        >
          <div
            className="image-preview-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="image-preview-heading">
              <div>
                <span>{activeAttachmentPreview.label}</span>
                <strong>{activeAttachmentPreview.caption}</strong>
              </div>
              <button
                type="button"
                className="icon-button"
                title="关闭预览"
                onClick={() => setActiveAttachmentPreviewId(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <img
              src={activeAttachmentPreviewDataUrl}
              alt={`${activeAttachmentPreview.label} ${activeAttachmentPreview.caption}`}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function createPreviewTradeDetail(trade: TradeSummary): TradeDetail {
  return {
    ...trade,
    stopLossPrice: null,
    takeProfitPrice: null,
    backgroundNote: null,
    entryReason: null,
    exitReason: null,
    emotionNote: null,
    lessonNote: null,
    entryRuleContent: null,
    entryRuleChecklist: [],
    executions: [
      {
        id: trade.id * 10 + 1,
        executedAt: trade.openedAt,
        side: trade.direction === "long" ? "buy" : "sell",
        price: trade.entryPriceAvg,
        quantity: trade.quantity,
        fee: 0,
        feeCurrency: "USD",
        executionType: "entry",
      },
      {
        id: trade.id * 10 + 2,
        executedAt: trade.closedAt,
        side: trade.direction === "long" ? "sell" : "buy",
        price: trade.exitPriceAvg,
        quantity: trade.quantity,
        fee: trade.feesTotal,
        feeCurrency: "USD",
        executionType: "exit",
      },
    ],
  };
}

function updatePreviewTradeSummary(
  trades: TradeSummary[],
  id: number,
  input: CreateClosedTradeInput,
  calculation: ReturnType<typeof calculateTradeFormPreview>,
): TradeSummary[] {
  return trades.map((trade) => {
    if (trade.id !== id) {
      return trade;
    }

    return {
      ...trade,
      symbol: input.symbol,
      direction: input.direction,
      openedAt: input.openedAt,
      closedAt: input.closedAt,
      entryPriceAvg: input.entryPrice,
      exitPriceAvg: input.exitPrice,
      quantity: input.quantity,
      feesTotal: input.feesTotal,
      grossPnl: calculation?.grossPnl ?? trade.grossPnl,
      netPnl: calculation?.netPnl ?? trade.netPnl,
      riskAmount: calculation?.riskAmount ?? trade.riskAmount,
      rMultiple: calculation?.rMultiple ?? trade.rMultiple,
    };
  });
}

function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default App;
