import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  FlaskConical,
  Camera,
  CheckCircle2,
  FileText,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { AttachmentSection } from "./AttachmentSection";
import { TradeTagSection } from "./TradeTagSection";
import { TradeJournalSection } from "./TradeJournalSection";
import type { AttachmentImageType, AttachmentPanelItem } from "../app/attachmentPanel";
import type { TradeJournalDraft } from "../app/tradeJournalWorkflow";
import {
  getAIReviewUsageSummary,
  getAIReviewScoreSummary,
  type ReviewActionState,
  type RuleCheckEditDraft,
} from "../app/reviewPanel";

type ReviewPanelState = {
  badge: string;
  status: string;
  description: string;
  bullets: string[];
  manualReviewStatus: string;
  canGenerate: boolean;
  canConfirm: boolean;
};

type AttachmentDraft = {
  imageType: AttachmentImageType;
  caption: string;
};

type TradeReviewPanelProps = {
  researchSection?: ReactNode;
  reviewPanel: ReviewPanelState;
  reviewAction: ReviewActionState;
  latestReview: AIReview | undefined;
  selectedTrade: TradeSummary | undefined;
  selectedTradeDetail: TradeDetail | undefined;
  isLoadingTradeDetail: boolean;
  tradeDetailError: string | null;
  isLoadingReview: boolean;
  reviewError: string | null;
  isSavingReview: boolean;
  isDeletingTrade: boolean;
  editingRuleCheckId: number | null;
  ruleCheckEditDraft: RuleCheckEditDraft;
  canSaveRuleCheck: boolean;
  savingRuleCheckId: number | null;
  attachmentPanel: {
    countLabel: string;
    emptyText: string | null;
    items: AttachmentPanelItem[];
  };
  attachmentDraft: AttachmentDraft;
  isLoadingAttachments: boolean;
  attachmentError: string | null;
  isSavingAttachment: boolean;
  deletingAttachmentId: number | null;
  attachmentImageDataUrls: Record<number, string>;
  tagAssignments: TradeTagAssignment[];
  availableTags: TagDefinition[];
  selectedTagId: string;
  isLoadingTags: boolean;
  isMutatingTags: boolean;
  tagMessage: string;
  tagError: string | null;
  canManageTags: boolean;
  tradeJournal: TradeJournal | undefined;
  tradeJournalDraft: TradeJournalDraft;
  isLoadingTradeJournal: boolean;
  isSavingTradeJournal: boolean;
  tradeJournalError: string | null;
  tradeJournalMessage: string;
  onEditSelectedTrade: () => void;
  onDeleteSelectedTrade: () => void;
  onCreateReviewDraft: () => void;
  onConfirmReview: () => void;
  onCorrectReview: () => void;
  onInvalidateReview: () => void;
  onStartRuleCheckEdit: (check: TradeRuleCheckDetail) => void;
  onRuleCheckDraftChange: (draft: RuleCheckEditDraft) => void;
  onCancelRuleCheckEdit: () => void;
  onSaveRuleCheck: (checkId: number) => void;
  onAttachmentDraftChange: (draft: AttachmentDraft) => void;
  onChooseAndAttach: () => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onPreviewAttachment: (attachmentId: number) => void;
  onSelectedTagChange: (tagId: string) => void;
  onAssignTag: () => void;
  onRemoveTag: (assignment: TradeTagAssignment) => void;
  onTradeJournalDraftChange: (draft: TradeJournalDraft) => void;
  onSaveTradeJournal: () => void;
};

export function TradeReviewPanel({
  researchSection,
  reviewPanel,
  reviewAction,
  latestReview,
  selectedTrade,
  selectedTradeDetail,
  isLoadingTradeDetail,
  tradeDetailError,
  isLoadingReview,
  reviewError,
  isSavingReview,
  isDeletingTrade,
  editingRuleCheckId,
  ruleCheckEditDraft,
  canSaveRuleCheck,
  savingRuleCheckId,
  attachmentPanel,
  attachmentDraft,
  isLoadingAttachments,
  attachmentError,
  isSavingAttachment,
  deletingAttachmentId,
  attachmentImageDataUrls,
  tagAssignments,
  availableTags,
  selectedTagId,
  isLoadingTags,
  isMutatingTags,
  tagMessage,
  tagError,
  canManageTags,
  tradeJournal,
  tradeJournalDraft,
  isLoadingTradeJournal,
  isSavingTradeJournal,
  tradeJournalError,
  tradeJournalMessage,
  onEditSelectedTrade,
  onDeleteSelectedTrade,
  onCreateReviewDraft,
  onConfirmReview,
  onCorrectReview,
  onInvalidateReview,
  onStartRuleCheckEdit,
  onRuleCheckDraftChange,
  onCancelRuleCheckEdit,
  onSaveRuleCheck,
  onAttachmentDraftChange,
  onChooseAndAttach,
  onDeleteAttachment,
  onPreviewAttachment,
  onSelectedTagChange,
  onAssignTag,
  onRemoveTag,
  onTradeJournalDraftChange,
  onSaveTradeJournal,
}: TradeReviewPanelProps) {
  const hasRuleBinding = Boolean(selectedTradeDetail?.entryRuleVersionId);
  const checklistCount = selectedTradeDetail?.entryRuleChecklist.length ?? 0;
  const ruleChecks = selectedTradeDetail?.ruleChecks ?? [];
  const evidenceCount = attachmentPanel.items.length;
  const usageSummary = getAIReviewUsageSummary(latestReview);
  const scoreSummary = getAIReviewScoreSummary(latestReview);

  const [activeTab, setActiveTab] = useState<"overview" | "journal" | "research" | "ai">("overview");
  const detailScroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (detailScroll.current) detailScroll.current.scrollTop = 0;
  }, [activeTab, selectedTrade?.id]);
  const tabId = `trade-detail-${selectedTrade?.id ?? "empty"}`;
  const tabs = [
    { id: "overview" as const, label: "交易概览", icon: FileText },
    { id: "journal" as const, label: "人工复盘", icon: BookOpen },
    ...(researchSection ? [{ id: "research" as const, label: "研究记录", icon: FlaskConical }] : []),
    { id: "ai" as const, label: "AI 复盘", icon: Sparkles },
  ];

  return (
    <section className="panel review-panel" aria-label="交易复盘">
      <div className="trade-detail-heading">
        <div className="trade-detail-identity">
          <div className="instrument-avatar" aria-hidden="true">{selectedTrade?.symbol ?? "—"}</div>
          <div>
            <h3>{selectedTrade ? `${selectedTrade.symbol} · ${selectedTrade.direction === "long" ? "做多" : "做空"}` : "交易详情"}</h3>
            <p>{selectedTrade ? `#${selectedTrade.id} · ${formatTradeTime(selectedTrade.openedAt)} → ${formatTradeTime(selectedTrade.closedAt)}` : "选择交易查看记录与证据"}</p>
          </div>
          {selectedTrade ? <span className={`status ${selectedTrade.aiReviewStatus}`}>{reviewPanel.status}</span> : null}
        </div>
        <div className="toolbar">
          <button type="button" className="secondary-button" onClick={onEditSelectedTrade} disabled={!selectedTradeDetail || isDeletingTrade}><Pencil aria-hidden="true" size={15} />编辑交易</button>
          <button type="button" className="icon-button danger-icon" aria-label={isDeletingTrade ? "删除中" : "删除交易"} title="删除选中交易" onClick={onDeleteSelectedTrade} disabled={!selectedTrade || isDeletingTrade}><Trash2 aria-hidden="true" size={16} /></button>
        </div>
      </div>
      {selectedTrade ? <div className="trade-summary-metrics">
        <div><span>净盈亏 · USD</span><strong className={selectedTrade.netPnl >= 0 ? "positive-text" : "negative-text"}>{formatCurrency(selectedTrade.netPnl)}</strong></div>
        <div><span>净 R 倍数</span><strong>{formatOptionalR(selectedTrade.rMultiple)}</strong></div>
        <div><span>合约数量</span><strong>{selectedTrade.quantity}<small> 手</small></strong></div>
        <div><span>手续费 · USD</span><strong>{formatCurrency(selectedTrade.feesTotal)}</strong></div>
      </div> : null}
      <WorkspaceTabs id={tabId} tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="trade-detail-scroll" ref={detailScroll}>
        {isLoadingTradeDetail ? <div className="table-state">正在读取这笔交易的详情...</div>
          : tradeDetailError ? <div className="detail-state error" role="alert">交易详情读取失败：{tradeDetailError}</div>
            : selectedTradeDetail ? <>
              <div className="trade-tab-panel" role="tabpanel" id={`${tabId}-panel-overview`} aria-labelledby={`${tabId}-tab-overview`} hidden={activeTab !== "overview"}>
                <section className="trade-info-section">
                  <div className="section-heading"><h4>交易事实</h4><span>已平仓</span></div>
                  <dl className="trade-facts-grid">
                    <div><dt>入场点位</dt><dd>{selectedTradeDetail.entryPriceAvg}</dd></div>
                    <div><dt>出场点位</dt><dd>{selectedTradeDetail.exitPriceAvg}</dd></div>
                    <div><dt>止损点位</dt><dd>{formatOptionalNumber(selectedTradeDetail.stopLossPrice)}</dd></div>
                    <div><dt>止盈点位</dt><dd>{formatOptionalNumber(selectedTradeDetail.takeProfitPrice)}</dd></div>
                    <div className="trade-rule-fact"><dt>绑定入场规则</dt><dd>{selectedTradeDetail.entryRuleName ? `${selectedTradeDetail.entryRuleName} / v${selectedTradeDetail.entryRuleVersionNo}` : "未绑定规则"}</dd></div>
                  </dl>
                </section>
                <div className="detail-notes">
                  <p>
                    <span>入场理由</span>
                    {selectedTradeDetail.entryReason || "未填写入场理由"}
                  </p>
                  <p>
                    <span>出场理由</span>
                    {selectedTradeDetail.exitReason || "未填写出场理由"}
                  </p>
                </div>
                <AttachmentSection
                  attachmentPanel={attachmentPanel}
                  attachmentDraft={attachmentDraft}
                  isLoadingAttachments={isLoadingAttachments}
                  attachmentError={attachmentError}
                  isSavingAttachment={isSavingAttachment}
                  canAttach={Boolean(selectedTrade)}
                  deletingAttachmentId={deletingAttachmentId}
                  attachmentImageDataUrls={attachmentImageDataUrls}
                  onAttachmentDraftChange={onAttachmentDraftChange}
                  onChooseAndAttach={onChooseAndAttach}
                  onDeleteAttachment={onDeleteAttachment}
                  onPreviewAttachment={onPreviewAttachment}
                />
                <TradeTagSection
                  assignments={tagAssignments}
                  availableTags={availableTags}
                  selectedTagId={selectedTagId}
                  isLoading={isLoadingTags}
                  isMutating={isMutatingTags}
                  canManage={canManageTags}
                  message={tagMessage}
                  error={tagError}
                  onSelectedTagChange={onSelectedTagChange}
                  onAssignTag={onAssignTag}
                  onRemoveTag={onRemoveTag}
                />
                <details className="execution-disclosure"><summary>成交执行记录 · {selectedTradeDetail.executions.length} 条</summary><div className="execution-list">
                  {selectedTradeDetail.executions.map((execution) => (
                    <div key={execution.id} className="execution-row">
                      <span>{execution.executionType}</span>
                      <strong>
                        {execution.side} {execution.quantity} @ {execution.price}
                      </strong>
                      <small>{formatTradeTime(execution.executedAt)}</small>
                    </div>
                  ))}
                </div></details>
              </div>
              <div className="trade-tab-panel" role="tabpanel" id={`${tabId}-panel-journal`} aria-labelledby={`${tabId}-tab-journal`} hidden={activeTab !== "journal"}><TradeJournalSection
                draft={tradeJournalDraft}
                journal={tradeJournal}
                isLoading={isLoadingTradeJournal}
                isSaving={isSavingTradeJournal}
                error={tradeJournalError}
                message={tradeJournalMessage}
                onDraftChange={onTradeJournalDraftChange}
                onSave={onSaveTradeJournal}
              /></div>
              {researchSection ? <div className="trade-tab-panel" role="tabpanel" id={`${tabId}-panel-research`} aria-labelledby={`${tabId}-tab-research`} hidden={activeTab !== "research"}>{researchSection}</div> : null}
              <div className="trade-tab-panel" role="tabpanel" id={`${tabId}-panel-ai`} aria-labelledby={`${tabId}-tab-ai`} hidden={activeTab !== "ai"}>
                <div className="section-heading"><h4>AI 复盘结果</h4><button type="button" className="primary-button" onClick={onCreateReviewDraft} disabled={!reviewPanel.canGenerate || !selectedTrade || isSavingReview} title={reviewPanel.canGenerate ? "生成 AI 复盘草稿" : "请先选择可复盘的交易"}><Sparkles aria-hidden="true" size={15} />{isSavingReview ? "正在生成" : "生成 AI 草稿"}</button></div>
                <div className="review-score">
                  <span>{reviewPanel.badge}</span>
                  <div>
                    <strong>{reviewPanel.status}</strong>
                    <p>{reviewPanel.description}</p>
                  </div>
                </div>

                <ul className="review-list">
                  {reviewPanel.bullets.map((bullet, index) => {
                    const Icon = index === 0 ? FileText : Camera;
                    return (
                      <li key={bullet}>
                        <Icon aria-hidden="true" size={17} />
                        {bullet}
                      </li>
                    );
                  })}
                </ul>
                <div className="review-workflow" aria-label="复盘流程状态">
                  <div className={selectedTradeDetail ? "workflow-step ready" : "workflow-step"}>
                    <FileText aria-hidden="true" size={15} />
                    <span>交易事实</span>
                    <strong>{selectedTradeDetail ? "已读取" : "待选择"}</strong>
                  </div>
                  <div className={evidenceCount > 0 ? "workflow-step ready" : "workflow-step"}>
                    <Camera aria-hidden="true" size={15} />
                    <span>截图证据</span>
                    <strong>{evidenceCount} 张</strong>
                  </div>
                  <div className={hasRuleBinding ? "workflow-step ready" : "workflow-step"}>
                    <CheckCircle2 aria-hidden="true" size={15} />
                    <span>规则版本</span>
                    <strong>{hasRuleBinding ? "已绑定" : "未绑定"}</strong>
                  </div>
                  <div
                    className={
                      selectedTrade?.aiReviewStatus === "confirmed" ||
                        selectedTrade?.aiReviewStatus === "corrected"
                        ? "workflow-step ready"
                        : reviewPanel.canConfirm
                          ? "workflow-step attention"
                          : "workflow-step"
                    }
                  >
                    <RotateCcw aria-hidden="true" size={15} />
                    <span>人工确认</span>
                    <strong>{reviewPanel.manualReviewStatus}</strong>
                  </div>
                </div>
                <div className="ai-draft-card">
                  <div className="detail-heading">
                    <strong>AI 复盘草稿</strong>
                    <span>{latestReview?.status ?? reviewPanel.status}</span>
                  </div>
                  {isLoadingReview ? (
                    <div className="detail-state">正在读取本机复盘草稿...</div>
                  ) : reviewError ? (
                    <div className="detail-state error">
                      复盘草稿读取失败：{reviewError}
                    </div>
                  ) : latestReview ? (
                    <>
                      <p>{latestReview.summary || reviewPanel.description}</p>
                      <div className="review-meta-grid">
                        <div>
                          <span>模型</span>
                          <strong>{latestReview.model ?? "未记录模型"}</strong>
                        </div>
                        <div>
                          <span>综合分</span>
                          <strong>{scoreSummary?.totalLabel ?? "-"}</strong>
                        </div>
                        <div>
                          <span>置信度</span>
                          <strong>{formatPercent(latestReview.confidence)}</strong>
                        </div>
                        {usageSummary ? (
                          <>
                            <div>
                              <span>Token</span>
                              <strong>{usageSummary.tokenLabel}</strong>
                            </div>
                            <div>
                              <span>成本</span>
                              <strong>{usageSummary.costLabel}</strong>
                            </div>
                          </>
                        ) : null}
                        {scoreSummary?.dimensions.map((dimension) => (
                          <div key={dimension.label}>
                            <span>{dimension.label}</span>
                            <strong>{dimension.value}</strong>
                          </div>
                        ))}
                      </div>
                      {scoreSummary ? (
                        <p className="review-scoring-note">
                          {scoreSummary.totalCaption}
                        </p>
                      ) : null}
                      <ReviewChipList title="优势" items={latestReview.strengths} />
                      <ReviewChipList title="建议" items={latestReview.suggestions} />
                    </>
                  ) : (
                    <p>{reviewAction.disabledReason ?? reviewPanel.description}</p>
                  )}
                  <div className="draft-review-slots">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={onConfirmReview}
                      disabled={!reviewAction.canResolveDraft}
                      title={reviewAction.disabledReason ?? "确认这条复盘"}
                    >
                      {reviewAction.confirmLabel}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={onCorrectReview}
                      disabled={!reviewAction.canResolveDraft}
                      title={reviewAction.disabledReason ?? "修正这条复盘"}
                    >
                      {reviewAction.correctLabel}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={onInvalidateReview}
                      disabled={!reviewAction.canResolveDraft}
                      title={reviewAction.disabledReason ?? "作废这条复盘"}
                    >
                      {reviewAction.invalidateLabel}
                    </button>
                  </div>
                </div>
                <div className="rule-check-card">
                  <div className="detail-heading">
                    <strong>规则检查</strong>
                    <span>{checklistCount} 项 checklist</span>
                  </div>
                  <div className="rule-check-grid">
                    <div>
                      <span>版本绑定</span>
                      <strong>{hasRuleBinding ? "已绑定" : "未绑定"}</strong>
                    </div>
                    <div>
                      <span>截图证据</span>
                      <strong>{evidenceCount} 张</strong>
                    </div>
                  </div>
                  <div className="rule-binding-box">
                    <span>入场规则</span>
                    <strong>
                      {selectedTradeDetail.entryRuleName
                        ? `${selectedTradeDetail.entryRuleName} / v${selectedTradeDetail.entryRuleVersionNo}`
                        : "未绑定规则"}
                    </strong>
                    {selectedTradeDetail.entryRuleContent ? (
                      <p>{selectedTradeDetail.entryRuleContent}</p>
                    ) : null}
                    {selectedTradeDetail.entryRuleChecklist.length > 0 ? (
                      <ul>
                        {selectedTradeDetail.entryRuleChecklist.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {ruleChecks.length > 0 ? (
                    <div className="rule-check-list">
                      {ruleChecks.map((check) => {
                        const isEditing = editingRuleCheckId === check.id;
                        const isSavingThisCheck = savingRuleCheckId === check.id;

                        return (
                          <div key={check.id} className="rule-check-result">
                            <span className={`rule-check-status ${check.result}`}>
                              {formatRuleCheckResult(check.result)}
                            </span>
                            <strong>{check.checkItem}</strong>
                            <button
                              type="button"
                              className="icon-button rule-check-edit-button"
                              onClick={() => onStartRuleCheckEdit(check)}
                              disabled={isSavingThisCheck}
                              title="编辑规则检查"
                              aria-label={`编辑规则检查：${check.checkItem}`}
                            >
                              <Pencil aria-hidden="true" size={14} />
                            </button>
                            {check.evidence ? <p>{check.evidence}</p> : null}
                            {check.comment ? <small>{check.comment}</small> : null}
                            {isEditing ? (
                              <div className="rule-check-editor">
                                <label>
                                  <span>结果</span>
                                  <select
                                    value={ruleCheckEditDraft.result}
                                    onChange={(event) =>
                                      onRuleCheckDraftChange({
                                        ...ruleCheckEditDraft,
                                        result: event.target
                                          .value as RuleCheckEditDraft["result"],
                                      })
                                    }
                                  >
                                    <option value="pass">通过</option>
                                    <option value="fail">未通过</option>
                                    <option value="unknown">待确认</option>
                                  </select>
                                </label>
                                <label>
                                  <span>证据</span>
                                  <textarea
                                    rows={2}
                                    value={ruleCheckEditDraft.evidence}
                                    onChange={(event) =>
                                      onRuleCheckDraftChange({
                                        ...ruleCheckEditDraft,
                                        evidence: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  <span>备注</span>
                                  <textarea
                                    rows={2}
                                    value={ruleCheckEditDraft.comment}
                                    onChange={(event) =>
                                      onRuleCheckDraftChange({
                                        ...ruleCheckEditDraft,
                                        comment: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <div className="rule-check-editor-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={onCancelRuleCheckEdit}
                                    disabled={isSavingThisCheck}
                                  >
                                    <X aria-hidden="true" size={14} />
                                    取消
                                  </button>
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => onSaveRuleCheck(check.id)}
                                    disabled={!canSaveRuleCheck}
                                  >
                                    <Save aria-hidden="true" size={14} />
                                    {isSavingThisCheck ? "正在保存" : "保存"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedTradeDetail.entryRuleChecklist.length > 0 ? (
                    <div className="detail-state">
                      生成 AI 草稿后，会按 checklist 逐项生成规则检查。
                    </div>
                  ) : null}
                </div>
              </div>
            </> : <div className="table-state">请选择一笔交易查看详情。</div>}
      </div>
    </section>
  );
}

function ReviewChipList({
  title,
  items,
}: {
  title: string;
  items: unknown[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="review-chip-list">
      <span>{title}</span>
      <div>
        {items.map((item, index) => (
          <strong key={`${String(item)}-${index}`}>{String(item)}</strong>
        ))}
      </div>
    </div>
  );
}

function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
}

function formatOptionalNumber(value: number | null) {
  return value ?? "-";
}

function formatOptionalR(value: number | null) {
  return value == null ? "-" : `${value.toFixed(2)}R`;
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${Math.round(value * 100)}%`;
}

function formatRuleCheckResult(result: TradeRuleCheckDetail["result"]) {
  if (result === "pass") {
    return "通过";
  }

  if (result === "fail") {
    return "未通过";
  }

  return "待确认";
}
