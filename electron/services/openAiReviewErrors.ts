export type OpenAIReviewErrorCategory =
  | "bad_request"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "server"
  | "network"
  | "unknown";

export type OpenAIReviewErrorDetails = {
  status?: number;
  responseText?: string;
  category: OpenAIReviewErrorCategory;
  retryable: boolean;
  cause?: unknown;
};

export class OpenAIReviewError extends Error {
  readonly status: number | undefined;
  readonly responseText: string | undefined;
  readonly category: OpenAIReviewErrorCategory;
  readonly retryable: boolean;
  override readonly cause: unknown;

  constructor(message: string, details: OpenAIReviewErrorDetails) {
    super(message);
    this.name = "OpenAIReviewError";
    this.status = details.status;
    this.responseText = details.responseText;
    this.category = details.category;
    this.retryable = details.retryable;
    this.cause = details.cause;
  }
}

export function classifyOpenAIReviewError(
  status: number,
  responseText: string,
): OpenAIReviewErrorDetails {
  if (status === 408) {
    return { status, responseText, category: "timeout", retryable: true };
  }

  if (status === 401 || status === 403) {
    return { status, responseText, category: "auth", retryable: false };
  }

  if (status === 400 || status === 422) {
    return { status, responseText, category: "bad_request", retryable: false };
  }

  if (status === 429) {
    return { status, responseText, category: "rate_limit", retryable: true };
  }

  if (status >= 500) {
    return { status, responseText, category: "server", retryable: true };
  }

  return { status, responseText, category: "unknown", retryable: false };
}

export function classifyNetworkOpenAIReviewError(
  cause: unknown,
): OpenAIReviewErrorDetails {
  return { category: "network", retryable: true, cause };
}
