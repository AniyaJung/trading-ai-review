import { describe, expect, it, vi } from "vitest";
import {
  createOpenAIProxyFetch,
  type OpenAIProxySession,
} from "./openAiProxyFetch";

function createSession() {
  const setProxy = vi.fn<OpenAIProxySession["setProxy"]>(async () => undefined);
  const fetch = vi.fn<OpenAIProxySession["fetch"]>(async () => ({
    ok: true,
    status: 200,
    text: async () => "ok",
  }));

  return { fetch, setProxy };
}

describe("createOpenAIProxyFetch", () => {
  it("applies the configured proxy before each OpenAI request", async () => {
    const openAISession = createSession();
    const fetch = createOpenAIProxyFetch(
      openAISession,
      () => "http://127.0.0.1:7890",
    );

    await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
      body: "{}",
    });

    expect(openAISession.setProxy).toHaveBeenCalledWith({
      mode: "fixed_servers",
      proxyRules: "http://127.0.0.1:7890",
    });
    expect(openAISession.setProxy.mock.invocationCallOrder[0]).toBeLessThan(
      openAISession.fetch.mock.invocationCallOrder[0],
    );
  });

  it("falls back to the system proxy when no override is configured", async () => {
    const openAISession = createSession();
    const fetch = createOpenAIProxyFetch(openAISession, () => "");

    await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {},
      body: "{}",
    });

    expect(openAISession.setProxy).toHaveBeenCalledWith({ mode: "system" });
  });
});
