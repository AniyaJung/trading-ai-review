import type { OpenAIReviewFetch } from "./openAiReviewClient.js";

export type OpenAIProxySession = {
  fetch: OpenAIReviewFetch;
  setProxy: (config: {
    mode: "fixed_servers" | "system";
    proxyRules?: string;
  }) => Promise<void>;
};

export function createOpenAIProxyFetch(
  openAISession: OpenAIProxySession,
  getProxyUrl: () => string,
): OpenAIReviewFetch {
  return async (url, init) => {
    const proxyUrl = getProxyUrl().trim();
    await openAISession.setProxy(
      proxyUrl
        ? { mode: "fixed_servers", proxyRules: proxyUrl }
        : { mode: "system" },
    );

    return openAISession.fetch(url, init);
  };
}
