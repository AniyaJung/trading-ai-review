import { describe, expect, it } from "vitest";
import { requestOpenAIReview } from "./openAiReviewClient";

describe("requestOpenAIReview", () => {
  it("does not expose the provider response in authentication errors", async () => {
    const request = requestOpenAIReview({
      fetch: async () => ({
        ok: false,
        status: 401,
        text: async () => "Incorrect API key provided: secret-fragment",
      }),
      url: "https://api.openai.com/v1/responses",
      init: { method: "POST", headers: {}, body: "{}" },
      maxAttempts: 1,
    });

    await expect(request).rejects.toThrow(
      "OpenAI review request failed (401): authentication was rejected. Check the saved API key.",
    );
    await expect(request).rejects.not.toThrow("secret-fragment");
  });

  it("reports a safe network cause without exposing arbitrary error text", async () => {
    const error = new Error("request failed with Authorization: Bearer secret", {
      cause: Object.assign(new Error("connection timeout"), {
        code: "UND_ERR_CONNECT_TIMEOUT",
      }),
    });

    const request = requestOpenAIReview({
      fetch: async () => Promise.reject(error),
      url: "https://api.openai.com/v1/responses",
      init: { method: "POST", headers: {}, body: "{}" },
      maxAttempts: 1,
    });

    await expect(request).rejects.toThrow(
      "OpenAI review request failed before a response was received: connection timed out (UND_ERR_CONNECT_TIMEOUT).",
    );
    await expect(request).rejects.not.toThrow("Bearer secret");
  });
});
