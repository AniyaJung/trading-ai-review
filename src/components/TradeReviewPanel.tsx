import {
  Camera,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AttachmentSection } from "./AttachmentSection";
import type { AttachmentImageType, AttachmentPanelItem } from "../app/attachmentPanel";
import type { ReviewActionState } from "../app/reviewPanel";

type ReviewPanelState = {
  badge: string;
  status: string;
  description: string;
  bullets: string[];
  canGenerate: boolean;
  canConfirm: boolean;
};

type AttachmentDraft = {
  imageType: AttachmentImageType;
  caption: string;
};

type TradeReviewPanelProps = {
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
  onEditSelectedTrade: () => void;
  onDeleteSelectedTrade: () => void;
  onConfirmReview: () => void;
  onCorrectReview: () => void;
  onInvalidateReview: () => void;
  onAttachmentDraftChange: (draft: AttachmentDraft) => void;
  onChooseAndAttach: () => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onPreviewAttachment: (attachmentId: number) => void;
};

export function TradeReviewPanel({
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
  attachmentPanel,
  attachmentDraft,
  isLoadingAttachments,
  attachmentError,
  isSavingAttachment,
  deletingAttachmentId,
  attachmentImageDataUrls,
  onEditSelectedTrade,
  onDeleteSelectedTrade,
  onConfirmReview,
  onCorrectReview,
  onInvalidateReview,
  onAttachmentDraftChange,
  onChooseAndAttach,
  onDeleteAttachment,
  onPreviewAttachment,
}: TradeReviewPanelProps) {
  const hasRuleBinding = Boolean(selectedTradeDetail?.entryRuleVersionId);
  const checklistCount = selectedTradeDetail?.entryRuleChecklist.length ?? 0;
  const evidenceCount = attachmentPanel.items.length;

  return (
    <section className="panel review-panel" aria-label="AI 复盘">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AI review draft</p>
          <h3>复盘结果</h3>
        </div>
        <Sparkles aria-hidden="true" size={18} />
      </div>

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
          <strong>{selectedTradeDetail ? "已读取" : "等待"}</strong>
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
        <div className={reviewPanel.canConfirm ? "workflow-step attention" : "workflow-step"}>
          <RotateCcw aria-hidden="true" size={15} />
          <span>人工确认</span>
          <strong>{reviewPanel.canConfirm ? "待处理" : "未开放"}</strong>
        </div>
      </div>

      <div className="detail-block">
        <div className="detail-heading">
          <strong>选中交易详情</strong>
          <span>{selectedTrade?.symbol ?? "-"}</span>
        </div>
        {isLoadingTradeDetail ? (
          <div className="detail-state">正在读取交易详情...</div>
        ) : tradeDetailError ? (
          <div className="detail-state error">读取详情失败：{tradeDetailError}</div>
        ) : selectedTradeDetail ? (
          <>
            <div className="detail-grid">
              <span>止损</span>
              <strong>{formatOptionalNumber(selectedTradeDetail.stopLossPrice)}</strong>
              <span>止盈</span>
              <strong>{formatOptionalNumber(selectedTradeDetail.takeProfitPrice)}</strong>
              <span>净盈亏</span>
              <strong>{formatCurrency(selectedTradeDetail.netPnl)}</strong>
              <span>R 倍数</span>
              <strong>{formatOptionalR(selectedTradeDetail.rMultiple)}</strong>
            </div>

            <div className="rule-check-card">
              <div className="detail-heading">
                <strong>规则检查</strong>
                <span>{checklistCount} 项 checklist</span>
              </div>
              <div className="rule-check-grid">
                <div>
                  <span>版本绑定</span>
                  <strong>{hasRuleBinding ? "ready" : "missing"}</strong>
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
            </div>

            <div className="detail-notes">
              <p>
                <span>入场理由</span>
                {selectedTradeDetail.entryReason || "未填写"}
              </p>
              <p>
                <span>出场理由</span>
                {selectedTradeDetail.exitReason || "未填写"}
              </p>
            </div>

            <div className="execution-list">
              {selectedTradeDetail.executions.map((execution) => (
                <div key={execution.id} className="execution-row">
                  <span>{execution.executionType}</span>
                  <strong>
                    {execution.side} {execution.quantity} @ {execution.price}
                  </strong>
                  <small>{formatTradeTime(execution.executedAt)}</small>
                </div>
              ))}
            </div>

            <div className="ai-draft-card">
              <div className="detail-heading">
                <strong>AI 复盘草稿</strong>
                <span>{latestReview?.status ?? reviewPanel.status}</span>
              </div>
              {isLoadingReview ? (
                <div className="detail-state">正在读取本地复盘草稿...</div>
              ) : reviewError ? (
                <div className="detail-state error">
                  读取复盘草稿失败：{reviewError}
                </div>
              ) : latestReview ? (
                <>
                  <p>{latestReview.summary || reviewPanel.description}</p>
                  <div className="review-meta-grid">
                    <div>
                      <span>模型</span>
                      <strong>{latestReview.model ?? "未记录"}</strong>
                    </div>
                    <div>
                      <span>分数</span>
                      <strong>{latestReview.scoreTotal ?? "-"}</strong>
                    </div>
                    <div>
                      <span>置信度</span>
                      <strong>{formatPercent(latestReview.confidence)}</strong>
                    </div>
                  </div>
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
                  title={reviewAction.disabledReason ?? "确认复盘草稿"}
                >
                  {reviewAction.confirmLabel}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onCorrectReview}
                  disabled={!reviewAction.canResolveDraft}
                  title={reviewAction.disabledReason ?? "修正复盘草稿摘要"}
                >
                  {reviewAction.correctLabel}
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={onInvalidateReview}
                  disabled={!reviewAction.canResolveDraft}
                  title={reviewAction.disabledReason ?? "标记复盘草稿无效"}
                >
                  {reviewAction.invalidateLabel}
                </button>
              </div>
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
          </>
        ) : (
          <div className="detail-state">暂无交易详情。</div>
        )}
      </div>

      <div className="review-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onEditSelectedTrade}
          disabled={!selectedTradeDetail || isDeletingTrade}
        >
          编辑交易
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={onDeleteSelectedTrade}
          disabled={!selectedTrade || isDeletingTrade}
          title="删除选中交易"
        >
          <Trash2 aria-hidden="true" size={16} />
          {isDeletingTrade ? "删除中" : "删除交易"}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled
          title={reviewPanel.canGenerate ? "生成接口待接入" : "当前状态不能生成"}
        >
          生成待接入
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onConfirmReview}
          disabled={!reviewAction.canResolveDraft || isSavingReview}
          title={reviewAction.disabledReason ?? "确认复盘草稿"}
        >
          {reviewAction.confirmLabel}
        </button>
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
  return `$${value}`;
}

function formatOptionalNumber(value: number | null) {
  return value ?? "-";
}

function formatOptionalR(value: number | null) {
  return value == null ? "-" : `${value}R`;
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${Math.round(value * 100)}%`;
}
