import type {
  AIReviewAdapter,
  AIReviewAdapterInput,
} from "./aiReviewService.js";
import {
  requestOpenAIReview,
  type OpenAIReviewFetch,
} from "./openAiReviewClient.js";
import {
  buildOpenAIReviewPrompt,
  openAIReviewPromptVersion,
} from "./openAiReviewPrompt.js";
import {
  normalizeOpenAIReviewResponse,
  parseJsonObject,
} from "./openAiReviewResponse.js";
import { reviewJsonSchema } from "./openAiReviewSchema.js";

export type FetchLike = OpenAIReviewFetch;

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
  maxAttempts?: number;
  retryDelayMs?: number;
};

const defaultModel = "gpt-5.5";
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
        config.promptVersion ??
        options.promptVersion ??
        openAIReviewPromptVersion;
      const fetchImpl =
        options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);

      if (!fetchImpl) {
        throw new Error("A fetch implementation is required to call OpenAI.");
      }

      const responseText = await requestOpenAIReview({
        fetch: fetchImpl,
        url: responsesUrl,
        init: {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildRequestBody(model, input)),
        },
        maxAttempts: options.maxAttempts,
        retryDelayMs: options.retryDelayMs,
      });

      const payload = parseJsonObject(responseText);
      const generated = normalizeOpenAIReviewResponse(
        payload,
        model,
        activePromptVersion,
      );

      return generated;
    },
  };
}

function buildRequestBody(model: string, input: AIReviewAdapterInput) {
  const content: Array<Record<string, unknown>> = [
        {
          type: "input_text",
          text: buildOpenAIReviewPrompt(input),
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
