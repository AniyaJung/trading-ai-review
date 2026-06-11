import type {
  AIReviewAdapter,
  AIReviewAdapterInput,
  GeneratedAIReviewDraft,
  GeneratedRuleCheck,
} from "./aiReviewService.js";
import type { JsonObject, RuleCheckResult } from "./reviewService.js";

export type FetchLike = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

type OpenAIReviewAdapterOptions = {
  apiKey?: string;
  model?: string;
  promptVersion?: string;
  getConfig?: () => {
    apiKey?: string;
    model?: string;
    promptVersion?: string;
  };
  fetch?: FetchLike;
};

const defaultModel = "gpt-5.5";
const promptVersion = "single-trade-ai-v1";
const responsesUrl = "https://api.openai.com/v1/responses";

export function createOpenAIReviewAdapter(
  options: OpenAIReviewAdapterOptions = {},
): AIReviewAdapter {
  return {
    generate: async (input) => {
      const config = options.getConfig?.() ?? {};
      const apiKey =
        config.apiKey ?? options.apiKey ?? process.env.OPENAI_API_KEY ?? "";

      if (!apiKey.trim()) {
        throw new Error("OPENAI_API_KEY is required to generate AI reviews.");
      }

      const model =
        config.model ?? options.model ?? process.env.OPENAI_MODEL ?? defaultModel;
      const activePromptVersion =
        config.promptVersion ?? options.promptVersion ?? promptVersion;
      const fetchImpl =
        options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);

      if (!fetchImpl) {
        throw new Error("A fetch implementation is required to call OpenAI.");
      }

      const response = await fetchImpl(responsesUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(model, input)),
      });
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`OpenAI review request failed (${response.status}): ${responseText}`);
      }

      const payload = parseJsonObject(responseText);
      const outputText = extractOutputText(payload);
      const generated = normalizeGeneratedReview(
        parseJsonObject(outputText),
        model,
        activePromptVersion,
        payload,
      );

      return generated;
    },
  };
}

function buildRequestBody(model: string, input: AIReviewAdapterInput) {
  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: buildPrompt(input),
    },
  ];

  for (const attachment of input.attachments) {
    content.push({
      type: "input_image",
      image_url: attachment.dataUrl,
      detail: "low",
    });
  }

  return {
    model,
    input: [
      {
        role: "user",
        content,
      },
    ],
    reasoning: {
      effort: "low",
    },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "trade_review",
        strict: true,
        schema: reviewJsonSchema,
      },
    },
  };
}

function buildPrompt(input: AIReviewAdapterInput) {
  return [
    "你是一个交易复盘助手，只做事后复盘，不预测行情，不给未来喊单。",
    "请基于交易事实、用户笔记、绑定的入场规则 checklist 和截图，输出结构化 JSON。",
    "如果证据不足，规则检查 result 使用 unknown，不要猜测。",
    "交易上下文：",
    JSON.stringify(
      {
        trade: input.trade,
        attachments: input.attachments.map((attachment) => ({
          id: attachment.id,
          imageType: attachment.imageType,
          caption: attachment.caption,
        })),
      },
      null,
      2,
    ),
  ].join("\n");
}

const reviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "scoreTotal",
    "facts",
    "missingInfo",
    "imageObservations",
    "strengths",
    "weaknesses",
    "suggestions",
    "tags",
    "confidence",
    "ruleChecks",
  ],
  properties: {
    summary: { type: ["string", "null"] },
    scoreTotal: { type: ["number", "null"] },
    facts: {
      type: "object",
      additionalProperties: false,
      required: [
        "symbol",
        "direction",
        "openedAt",
        "closedAt",
        "netPnl",
        "rMultiple",
        "entryRuleName",
      ],
      properties: {
        symbol: { type: ["string", "null"] },
        direction: { type: ["string", "null"] },
        openedAt: { type: ["string", "null"] },
        closedAt: { type: ["string", "null"] },
        netPnl: { type: ["number", "null"] },
        rMultiple: { type: ["number", "null"] },
        entryRuleName: { type: ["string", "null"] },
      },
    },
    missingInfo: { type: "array", items: { type: "string" } },
    imageObservations: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    confidence: { type: ["number", "null"] },
    ruleChecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["checkItem", "result", "evidence", "comment", "scoreDelta"],
        properties: {
          checkItem: { type: "string" },
          result: { type: "string", enum: ["pass", "fail", "unknown"] },
          evidence: { type: ["string", "null"] },
          comment: { type: ["string", "null"] },
          scoreDelta: { type: ["number", "null"] },
        },
      },
    },
  },
};

function extractOutputText(payload: JsonObject) {
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

function normalizeGeneratedReview(
  value: JsonObject,
  model: string,
  activePromptVersion: string,
  payload: JsonObject,
): GeneratedAIReviewDraft {
  return {
    model,
    promptVersion: activePromptVersion,
    scoreTotal: nullableNumber(value.scoreTotal),
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
    },
    ruleChecks: normalizeRuleChecks(value.ruleChecks),
  };
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

function parseJsonObject(text: string): JsonObject {
  const value = JSON.parse(text) as unknown;

  if (!isJsonObject(value)) {
    throw new Error("Expected a JSON object from OpenAI.");
  }

  return value;
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
