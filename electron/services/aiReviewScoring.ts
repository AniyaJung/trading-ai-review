import type { AIReviewScoreBreakdown } from "../../shared/contracts/desktopApi.js";
import type { GeneratedRuleCheck } from "./aiReviewService.js";

export const aiReviewScoringVersion = "three-dimension-v1";

type ScoreGeneratedAIReviewInput = {
  reportedScoreTotal: number | null;
  scoreBreakdown: AIReviewScoreBreakdown | null;
  attachmentCount: number;
  hasCompleteEvidenceCoverage: boolean;
  missingInfoCount: number;
  imageObservationCount: number;
  ruleChecks: GeneratedRuleCheck[];
  hasBoundRule: boolean;
  hasDefinedRisk: boolean;
};

export type ScoredAIReview = {
  scoreTotal: number | null;
  scoreBreakdown: AIReviewScoreBreakdown | null;
  scoringVersion: string | null;
};

export function scoreGeneratedAIReview({
  reportedScoreTotal,
  scoreBreakdown,
  attachmentCount,
  hasCompleteEvidenceCoverage,
  missingInfoCount,
  imageObservationCount,
  ruleChecks,
  hasBoundRule,
  hasDefinedRisk,
}: ScoreGeneratedAIReviewInput): ScoredAIReview {
  if (!scoreBreakdown) {
    return {
      scoreTotal: normalizeScore(reportedScoreTotal),
      scoreBreakdown: null,
      scoringVersion: null,
    };
  }

  let ruleAdherence = normalizeScore(scoreBreakdown.ruleAdherence) ?? 0;
  let evidenceQuality = normalizeScore(scoreBreakdown.evidenceQuality) ?? 0;
  let executionQuality = normalizeScore(scoreBreakdown.executionQuality) ?? 0;
  const hasUnknownRuleCheck = ruleChecks.some(
    (check) => check.result === "unknown",
  );
  const hasFailedRuleCheck = ruleChecks.some((check) => check.result === "fail");

  if (!hasBoundRule) {
    ruleAdherence = Math.min(ruleAdherence, 60);
  } else if (hasUnknownRuleCheck) {
    ruleAdherence = Math.min(ruleAdherence, 75);
  }

  if (hasFailedRuleCheck) {
    ruleAdherence = Math.min(ruleAdherence, 60);
  }

  if (attachmentCount === 0) {
    evidenceQuality = Math.min(evidenceQuality, 20);
  } else if (imageObservationCount === 0) {
    evidenceQuality = Math.min(evidenceQuality, 50);
  } else if (!hasCompleteEvidenceCoverage) {
    evidenceQuality = Math.min(evidenceQuality, 80);
  }

  if (missingInfoCount > 0) {
    evidenceQuality = Math.min(evidenceQuality, 70);
  }

  if (!hasDefinedRisk) {
    executionQuality = Math.min(executionQuality, 70);
  }

  const normalizedBreakdown = {
    ruleAdherence,
    evidenceQuality,
    executionQuality,
  };
  let scoreTotal = Math.round(
    ruleAdherence * 0.4 + evidenceQuality * 0.35 + executionQuality * 0.25,
  );

  if (missingInfoCount > 0 || hasUnknownRuleCheck) {
    scoreTotal = Math.min(scoreTotal, 89);
  }

  return {
    scoreTotal,
    scoreBreakdown: normalizedBreakdown,
    scoringVersion: aiReviewScoringVersion,
  };
}

function normalizeScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}
