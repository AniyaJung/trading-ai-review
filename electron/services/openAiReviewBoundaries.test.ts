import { describe, expect, it } from "vitest";
import type { AIReviewAdapterInput } from "./aiReviewService";
import {
  classifyOpenAIReviewError,
  OpenAIReviewError,
} from "./openAiReviewErrors";
import { buildOpenAIReviewPrompt } from "./openAiReviewPrompt";
import { normalizeOpenAIReviewResponse } from "./openAiReviewResponse";
import { reviewJsonSchema } from "./openAiReviewSchema";

function createAdapterInput(): AIReviewAdapterInput {
  return {
    trade: {
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
      stopLossPrice: 5298,
      takeProfitPrice: 5306,
      feesTotal: 5,
      grossPnl: 450,
      netPnl: 445,
      riskAmount: 200,
      rMultiple: 2.225,
      entryRuleId: 1,
      entryRuleVersionId: 2,
      entryRuleName: "Opening range pullback",
      entryRuleVersionNo: 1,
      entryRuleContent: "Break, retest, enter with defined risk.",
      entryRuleChecklist: ["Break confirmed"],
      backgroundNote: null,
      entryReason: "Opening range broke and retested.",
      exitReason: null,
      emotionNote: null,
      lessonNote: null,
      aiReviewStatus: "not_generated",
      ruleChecks: [],
      executions: [],
    },
    attachments: [
      {
        id: 7,
        imageType: "entry",
        caption: "Marked entry chart",
        dataUrl: "data:image/png;base64,abcd",
      },
    ],
  };
}

describe("OpenAI review adapter boundaries", () => {
  it("builds a prompt with trade facts and attachment metadata but without image data URLs", () => {
    const prompt = buildOpenAIReviewPrompt(createAdapterInput());

    expect(prompt).toContain("ES");
    expect(prompt).toContain("Opening range pullback");
    expect(prompt).toContain("Marked entry chart");
    expect(prompt).not.toContain("data:image/png;base64");
  });

  it("keeps the structured output schema fields required", () => {
    expect(reviewJsonSchema.required).toEqual([
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
    ]);
  });

  it("normalizes generated review output and preserves provider usage", () => {
    const result = normalizeOpenAIReviewResponse(
      {
        id: "resp_123",
        output_text: JSON.stringify({
          summary: "AI summary",
          scoreTotal: 84,
          facts: { symbol: "ES" },
          missingInfo: [],
          imageObservations: [],
          strengths: [],
          weaknesses: [],
          suggestions: [],
          tags: ["rule-following"],
          confidence: 0.81,
          ruleChecks: [
            {
              checkItem: "Break confirmed",
              result: "maybe",
              evidence: "Screenshot shows a break.",
              comment: "AI generated.",
              scoreDelta: 4,
            },
          ],
        }),
        usage: {
          input_tokens: 120,
          output_tokens: 80,
          total_tokens: 200,
        },
      },
      "gpt-test",
      "prompt-test",
    );

    expect(result.ruleChecks[0].result).toBe("unknown");
    expect(result.rawResult).toEqual(
      expect.objectContaining({
        provider: "openai",
        responseId: "resp_123",
        usage: {
          input_tokens: 120,
          output_tokens: 80,
          total_tokens: 200,
        },
      }),
    );
  });

  it("classifies retryable OpenAI failures", () => {
    expect(classifyOpenAIReviewError(429, "rate limited")).toEqual(
      expect.objectContaining({
        status: 429,
        retryable: true,
        category: "rate_limit",
      }),
    );
    expect(classifyOpenAIReviewError(500, "server error")).toEqual(
      expect.objectContaining({
        status: 500,
        retryable: true,
        category: "server",
      }),
    );
    expect(classifyOpenAIReviewError(400, "bad request")).toEqual(
      expect.objectContaining({
        status: 400,
        retryable: false,
        category: "bad_request",
      }),
    );
    expect(new OpenAIReviewError("OpenAI review request failed", {
      category: "network",
      retryable: true,
    })).toBeInstanceOf(Error);
  });
});
