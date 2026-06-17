import { describe, expect, it } from "vitest";
import type { AIReviewAdapterInput } from "./aiReviewService";
import { OpenAIReviewError } from "./openAiReviewErrors";
import {
  createOpenAIReviewAdapter,
  type FetchLike,
} from "./openAiReviewAdapter";

describe("createOpenAIReviewAdapter", () => {
  it("sends a multimodal structured-output Responses API request", async () => {
    const requests: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: "resp_123",
            output_text: JSON.stringify({
              summary: "AI summary",
              scoreTotal: 84,
              facts: { symbol: "ES" },
              missingInfo: [],
              imageObservations: ["Entry chart confirms the pullback."],
              strengths: ["Defined risk."],
              weaknesses: [],
              suggestions: ["Keep attaching marked charts."],
              tags: ["rule-following"],
              confidence: 0.81,
              ruleChecks: [
                {
                  checkItem: "Break confirmed",
                  result: "pass",
                  evidence: "Screenshot shows break above opening range.",
                  comment: "AI generated.",
                  scoreDelta: 4,
                },
              ],
            }),
          }),
      };
    };
    const adapter = createOpenAIReviewAdapter({
      apiKey: "sk-test",
      model: "gpt-test",
      fetch,
    });

    const result = await adapter.generate({
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
          caption: "Marked entry",
          dataUrl: "data:image/png;base64,abcd",
        },
      ],
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.openai.com/v1/responses");
    expect(requests[0].init.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer sk-test",
        "Content-Type": "application/json",
      }),
    );
    const body = JSON.parse(String(requests[0].init.body));
    expect(body).toEqual(
      expect.objectContaining({
        model: "gpt-test",
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            name: "trade_review",
            strict: true,
          }),
        }),
      }),
    );
    expect(body.input[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "input_text" }),
        {
          type: "input_image",
          image_url: "data:image/png;base64,abcd",
          detail: "low",
        },
      ]),
    );
    expect(result).toEqual(
      expect.objectContaining({
        model: "gpt-test",
        promptVersion: "single-trade-ai-v1",
        summary: "AI summary",
        rawResult: expect.objectContaining({
          provider: "openai",
          responseId: "resp_123",
        }),
      }),
    );
  });

  it("requires an API key before making a request", async () => {
    const adapter = createOpenAIReviewAdapter({
      apiKey: "",
      fetch: async () => {
        throw new Error("Fetch should not be called.");
      },
    });

    await expect(
      adapter.generate({
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
          takeProfitPrice: null,
          feesTotal: 5,
          grossPnl: 450,
          netPnl: 445,
          riskAmount: 200,
          rMultiple: 2.225,
          entryRuleId: null,
          entryRuleVersionId: null,
          entryRuleName: null,
          entryRuleVersionNo: null,
          entryRuleContent: null,
          entryRuleChecklist: [],
          backgroundNote: null,
          entryReason: null,
          exitReason: null,
          emotionNote: null,
          lessonNote: null,
          aiReviewStatus: "not_generated",
          ruleChecks: [],
          executions: [],
        },
        attachments: [],
      }),
    ).rejects.toThrow("OPENAI_API_KEY is required");
  });

  it("reads dynamic AI settings when generating a review", async () => {
    const requests: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            output_text: JSON.stringify({
              summary: "Configured summary",
              scoreTotal: null,
              facts: {},
              missingInfo: [],
              imageObservations: [],
              strengths: [],
              weaknesses: [],
              suggestions: [],
              tags: [],
              confidence: null,
              ruleChecks: [],
            }),
          }),
      };
    };
    const adapter = createOpenAIReviewAdapter({
      fetch,
      getConfig: () => ({
        apiKey: "sk-configured",
        model: "gpt-configured",
        promptVersion: "configured-prompt-v2",
      }),
    });

    const result = await adapter.generate({
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
        takeProfitPrice: null,
        feesTotal: 5,
        grossPnl: 450,
        netPnl: 445,
        riskAmount: 200,
        rMultiple: 2.225,
        entryRuleId: null,
        entryRuleVersionId: null,
        entryRuleName: null,
        entryRuleVersionNo: null,
        entryRuleContent: null,
        entryRuleChecklist: [],
        backgroundNote: null,
        entryReason: null,
        exitReason: null,
        emotionNote: null,
        lessonNote: null,
        aiReviewStatus: "not_generated",
        ruleChecks: [],
        executions: [],
      },
      attachments: [],
    });

    expect(requests[0].init.headers.Authorization).toBe("Bearer sk-configured");
    expect(JSON.parse(String(requests[0].init.body)).model).toBe(
      "gpt-configured",
    );
    expect(result.promptVersion).toBe("configured-prompt-v2");
  });

  it("retries retryable OpenAI failures before returning a generated review", async () => {
    const requests: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      requests.push({ url, init });

      if (requests.length === 1) {
        return {
          ok: false,
          status: 429,
          text: async () => "rate limited",
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            output_text: JSON.stringify({
              summary: "Retried summary",
              scoreTotal: null,
              facts: {},
              missingInfo: [],
              imageObservations: [],
              strengths: [],
              weaknesses: [],
              suggestions: [],
              tags: [],
              confidence: null,
              ruleChecks: [],
            }),
          }),
      };
    };
    const adapter = createOpenAIReviewAdapter({
      apiKey: "sk-test",
      fetch,
      maxAttempts: 2,
      retryDelayMs: 0,
    });

    const result = await adapter.generate(createAdapterInput());

    expect(requests).toHaveLength(2);
    expect(result.summary).toBe("Retried summary");
  });

  it("does not retry non-retryable OpenAI request failures", async () => {
    const requests: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      requests.push({ url, init });
      return {
        ok: false,
        status: 400,
        text: async () => "bad request",
      };
    };
    const adapter = createOpenAIReviewAdapter({
      apiKey: "sk-test",
      fetch,
      maxAttempts: 2,
      retryDelayMs: 0,
    });

    await expect(adapter.generate(createAdapterInput())).rejects.toMatchObject({
      category: "bad_request",
      retryable: false,
    } satisfies Partial<OpenAIReviewError>);
    expect(requests).toHaveLength(1);
  });
});

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
      takeProfitPrice: null,
      feesTotal: 5,
      grossPnl: 450,
      netPnl: 445,
      riskAmount: 200,
      rMultiple: 2.225,
      entryRuleId: null,
      entryRuleVersionId: null,
      entryRuleName: null,
      entryRuleVersionNo: null,
      entryRuleContent: null,
      entryRuleChecklist: [],
      backgroundNote: null,
      entryReason: null,
      exitReason: null,
      emotionNote: null,
      lessonNote: null,
      aiReviewStatus: "not_generated",
      ruleChecks: [],
      executions: [],
    },
    attachments: [],
  };
}
