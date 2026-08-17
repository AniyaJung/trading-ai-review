import { describe, expect, it } from "vitest";
import { createOpenAIReviewAdapter, type FetchLike } from "./openAiReviewAdapter";

describe("OpenAI review fixture eval", () => {
  it("builds a multimodal request and normalizes nested Responses API output", async () => {
    const requests: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: "resp_nested",
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      summary: "Nested response summary",
                      scoreBreakdown: {
                        ruleAdherence: 78,
                        evidenceQuality: 58,
                        executionQuality: 82,
                      },
                      facts: { symbol: "ES" },
                      missingInfo: ["exit screenshot"],
                      imageObservations: ["Entry image was attached."],
                      strengths: ["Defined risk."],
                      weaknesses: [],
                      suggestions: ["Attach exit chart."],
                      tags: ["rule-following"],
                      confidence: 0.7,
                      ruleChecks: [],
                    }),
                  },
                ],
              },
            ],
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              total_tokens: 150,
            },
          }),
      };
    };
    const adapter = createOpenAIReviewAdapter({
      apiKey: "sk-test",
      model: "gpt-fixture",
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
          id: 9,
          imageType: "entry",
          caption: "Marked entry",
          dataUrl: "data:image/png;base64,abcd",
        },
      ],
    });

    const body = JSON.parse(String(requests[0].init.body));
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
        model: "gpt-fixture",
        summary: "Nested response summary",
        rawResult: expect.objectContaining({
          responseId: "resp_nested",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
          },
        }),
      }),
    );
  });
});
