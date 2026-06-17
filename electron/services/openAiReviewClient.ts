import {
  OpenAIReviewError,
  classifyNetworkOpenAIReviewError,
  classifyOpenAIReviewError,
} from "./openAiReviewErrors.js";

export type OpenAIReviewFetch = (
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

export type RequestOpenAIReviewOptions = {
  fetch: OpenAIReviewFetch;
  url: string;
  init: Parameters<OpenAIReviewFetch>[1];
  maxAttempts?: number;
  retryDelayMs?: number;
};

export async function requestOpenAIReview({
  fetch,
  url,
  init,
  maxAttempts = 2,
  retryDelayMs = 250,
}: RequestOpenAIReviewOptions) {
  const attempts = Math.max(1, maxAttempts);
  let lastError: OpenAIReviewError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const responseText = await response.text();

      if (response.ok) {
        return responseText;
      }

      throw new OpenAIReviewError(
        `OpenAI review request failed (${response.status}): ${responseText}`,
        classifyOpenAIReviewError(response.status, responseText),
      );
    } catch (error) {
      const reviewError =
        error instanceof OpenAIReviewError
          ? error
          : new OpenAIReviewError(
              "OpenAI review request failed before a response was received.",
              classifyNetworkOpenAIReviewError(error),
            );

      lastError = reviewError;

      if (!reviewError.retryable || attempt === attempts) {
        throw reviewError;
      }

      await delay(retryDelayMs);
    }
  }

  throw lastError;
}

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}
