import type { JsonObject } from "./commonContracts.js";

export type ReviewStatus =
  | "draft"
  | "needs_review"
  | "confirmed"
  | "corrected"
  | "invalid";

export type RuleCheckResult = "pass" | "fail" | "unknown";

export type TradeRuleCheckDetail = {
  id: number;
  entryRuleVersionId: number;
  checkItem: string;
  result: RuleCheckResult;
  evidence: string | null;
  comment: string | null;
  scoreDelta: number | null;
  createdAt: string;
};

export type AIReview = {
  id: number;
  tradeId: number;
  status: ReviewStatus;
  model: string | null;
  promptVersion: string | null;
  ruleVersionSnapshot: string | null;
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
  createdAt: string;
  confirmedAt: string | null;
};

export type CreateReviewDraftInput = {
  tradeId: number;
  model?: string | null;
  promptVersion?: string | null;
  ruleVersionSnapshot?: string | null;
  scoreTotal?: number | null;
  summary?: string | null;
  facts?: JsonObject;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: JsonObject;
};

export type CorrectReviewInput = {
  summary?: string | null;
  facts?: JsonObject;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: JsonObject;
};

export type UpdateRuleCheckInput = {
  result: RuleCheckResult;
  evidence?: string | null;
  comment?: string | null;
};

export type UpdatedRuleCheck = TradeRuleCheckDetail & {
  tradeId: number;
};
