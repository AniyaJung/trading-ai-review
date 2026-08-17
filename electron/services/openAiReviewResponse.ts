import type { GeneratedAIReviewDraft, GeneratedRuleCheck } from "./aiReviewService.js";
import type { AIReviewScoreBreakdown } from "../../shared/contracts/desktopApi.js";
import type { JsonObject, RuleCheckResult } from "./reviewService.js";

export function normalizeOpenAIReviewResponse(
  payload: JsonObject,
  model: string,
  activePromptVersion: string,
): GeneratedAIReviewDraft {
  const outputText = extractOutputText(payload);
  const value = parseJsonObject(outputText);

  return {
    model,
    promptVersion: activePromptVersion,
    scoreTotal: nullableNumber(value.scoreTotal),
    scoreBreakdown: normalizeScoreBreakdown(value.scoreBreakdown),
    summary: nullableString(value.summary),
    facts: isJsonObject(value.facts) ? value.facts : {},
    missingInfo: arrayValue(value.missingInfo),
    imageObservations: arrayValue(value.imageObservations),
    strengths: arrayValue(value.strengths),
    weaknesses: arrayValue(value.weaknesses),
    suggestions: arrayValue(value.suggestions),
    tags: arrayValue(value.tags),
    confidence: nullableNumber(value.confidence),
    rawResult: {
      provider: "openai",
      responseId: typeof payload.id === "string" ? payload.id : null,
      model,
      output: value,
      usage: isJsonObject(payload.usage) ? payload.usage : null,
      costUsd: nullableNumber(payload.costUsd ?? payload.cost_usd),
      estimatedCostUsd: nullableNumber(
        payload.estimatedCostUsd ?? payload.estimated_cost_usd,
      ),
    },
    ruleChecks: normalizeRuleChecks(value.ruleChecks),
  };
}

function normalizeScoreBreakdown(
  value: unknown,
): AIReviewScoreBreakdown | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const ruleAdherence = nullableNumber(value.ruleAdherence);
  const evidenceQuality = nullableNumber(value.evidenceQuality);
  const executionQuality = nullableNumber(value.executionQuality);

  return ruleAdherence == null ||
    evidenceQuality == null ||
    executionQuality == null
    ? null
    : { ruleAdherence, evidenceQuality, executionQuality };
}

export function extractOutputText(payload: JsonObject) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!isJsonObject(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (
        isJsonObject(contentItem) &&
        typeof contentItem.text === "string" &&
        (contentItem.type === "output_text" || contentItem.type === "text")
      ) {
        return contentItem.text;
      }
    }
  }

  throw new Error("OpenAI response did not include output text.");
}

export function parseJsonObject(text: string): JsonObject {
  const value = JSON.parse(text) as unknown;

  if (!isJsonObject(value)) {
    throw new Error("Expected a JSON object from OpenAI.");
  }

  return value;
}

function normalizeRuleChecks(value: unknown): GeneratedRuleCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isJsonObject)
    .map((item) => ({
      checkItem: typeof item.checkItem === "string" ? item.checkItem : "",
      result: normalizeRuleCheckResult(item.result),
      evidence: nullableString(item.evidence),
      comment: nullableString(item.comment),
      scoreDelta: nullableNumber(item.scoreDelta),
    }))
    .filter((item) => item.checkItem.trim().length > 0);
}

function normalizeRuleCheckResult(value: unknown): RuleCheckResult {
  if (value === "pass" || value === "fail" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
