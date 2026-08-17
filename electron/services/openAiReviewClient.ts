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
        buildResponseErrorMessage(response.status),
        classifyOpenAIReviewError(response.status, responseText),
      );
    } catch (error) {
      const reviewError =
        error instanceof OpenAIReviewError
          ? error
          : new OpenAIReviewError(
              buildNetworkErrorMessage(error),
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

function buildResponseErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return `OpenAI review request failed (${status}): authentication was rejected. Check the saved API key.`;
  }

  if (status === 400 || status === 422) {
    return `OpenAI review request failed (${status}): the model or request configuration was rejected.`;
  }

  if (status === 408) {
    return `OpenAI review request failed (${status}): the request timed out.`;
  }

  if (status === 429) {
    return `OpenAI review request failed (${status}): the API rate limit was reached.`;
  }

  if (status >= 500) {
    return `OpenAI review request failed (${status}): the OpenAI service returned an error.`;
  }

  return `OpenAI review request failed (${status}).`;
}

function buildNetworkErrorMessage(error: unknown) {
  const detail = describeNetworkError(error);
  return `OpenAI review request failed before a response was received${
    detail ? `: ${detail}` : ""
  }.`;
}

function describeNetworkError(error: unknown) {
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    const record =
      typeof current === "object" ? (current as Record<string, unknown>) : null;
    const code = typeof record?.code === "string" ? record.code : "";
    const message =
      typeof record?.message === "string" ? record.message : String(current);
    const signature = `${code} ${message}`;

    if (/UND_ERR_CONNECT_TIMEOUT|ERR_CONNECTION_TIMED_OUT|timed?\s*out/i.test(signature)) {
      return code ? `connection timed out (${code})` : "connection timed out";
    }
    if (/ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED/i.test(signature)) {
      return "proxy connection failed";
    }
    if (/ECONNREFUSED|ERR_CONNECTION_REFUSED/i.test(signature)) {
      return "connection was refused";
    }
    if (/ENOTFOUND|ERR_NAME_NOT_RESOLVED/i.test(signature)) {
      return "host name could not be resolved";
    }

    current = record?.cause;
  }

  return "network connection failed";
}

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}
