import type { DatabaseSync } from "node:sqlite";
import {
  listAttachmentsByTrade,
  readAttachmentImageDataUrl,
  type AttachmentImageType,
} from "./attachmentService.js";
import {
  createReviewDraft,
  type AIReview,
  type JsonObject,
  type RuleCheckResult,
} from "./reviewService.js";
import { getTradeDetail, type TradeDetail } from "./tradeService.js";

export type AIReviewAttachmentInput = {
  id: number;
  imageType: AttachmentImageType;
  caption: string | null;
  dataUrl: string;
};

export type AIReviewAdapterInput = {
  trade: TradeDetail;
  attachments: AIReviewAttachmentInput[];
};

export type GeneratedRuleCheck = {
  checkItem: string;
  result: RuleCheckResult;
  evidence: string | null;
  comment: string | null;
  scoreDelta: number | null;
};

export type GeneratedAIReviewDraft = {
  model: string;
  promptVersion: string;
  ruleVersionSnapshot?: string | null;
  scoreTotal: number | null;
  summary: string | null;
  facts: JsonObject;
  missingInfo: unknown[];
  imageObservations: unknown[];
  strengths: unknown[];
  weaknesses: unknown[];
  suggestions: unknown[];
  tags: unknown[];
  confidence: number | null;
  rawResult: JsonObject;
  ruleChecks: GeneratedRuleCheck[];
};

export type AIReviewAdapter = {
  generate: (input: AIReviewAdapterInput) => Promise<GeneratedAIReviewDraft>;
};

export async function generateAIReviewDraft(
  db: DatabaseSync,
  tradeId: number,
  adapter: AIReviewAdapter,
): Promise<AIReview> {
  const trade = getTradeDetail(db, tradeId);

  if (!trade) {
    throw new Error(`Trade ${tradeId} was not found.`);
  }

  const attachments = listAttachmentsByTrade(db, tradeId).map((attachment) => ({
    id: attachment.id,
    imageType: attachment.imageType,
    caption: attachment.caption,
    dataUrl: readAttachmentImageDataUrl(db, attachment.id),
  }));
  const generated = await adapter.generate({ trade, attachments });
  const review = createReviewDraft(db, {
    tradeId,
    model: generated.model,
    promptVersion: generated.promptVersion,
    ruleVersionSnapshot:
      generated.ruleVersionSnapshot ?? trade.entryRuleContent ?? null,
    scoreTotal: generated.scoreTotal,
    summary: generated.summary,
    facts: generated.facts,
    missingInfo: generated.missingInfo,
    imageObservations: generated.imageObservations,
    strengths: generated.strengths,
    weaknesses: generated.weaknesses,
    suggestions: generated.suggestions,
    tags: generated.tags,
    confidence: generated.confidence,
    rawResult: generated.rawResult,
  });

  applyGeneratedRuleChecks(db, tradeId, generated.ruleChecks);

  return review;
}

function applyGeneratedRuleChecks(
  db: DatabaseSync,
  tradeId: number,
  ruleChecks: GeneratedRuleCheck[],
) {
  if (ruleChecks.length === 0) {
    return;
  }

  const update = db.prepare(
    `update trade_rule_check
     set result = ?,
         evidence = ?,
         comment = ?,
         score_delta = ?
     where trade_id = ?
       and check_item = ?`,
  );

  for (const check of ruleChecks) {
    update.run(
      check.result,
      check.evidence,
      check.comment,
      check.scoreDelta,
      tradeId,
      check.checkItem,
    );
  }
}
