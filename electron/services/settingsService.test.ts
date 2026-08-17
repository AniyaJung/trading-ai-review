import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeAppDatabase } from "../data/database";
import {
  getOpenAIAdapterConfig,
  getSettingsSummary,
  saveAISettings,
  type SettingsServicePaths,
} from "./settingsService";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createPaths(): SettingsServicePaths {
  const appDataDir = createTempDir("trading-ai-review-settings-service-");
  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

const secretCodec = {
  encrypt: (value: string) => `encrypted:${Buffer.from(value).toString("base64")}`,
  decrypt: (value: string) =>
    Buffer.from(value.replace(/^encrypted:/, ""), "base64").toString("utf8"),
};

afterEach(() => {
  vi.unstubAllEnvs();

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("settingsService", () => {
  it("summarizes AI settings without exposing the API key", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);

    saveAISettings(
      db,
      {
        apiKey: "sk-local-secret",
        model: "gpt-local",
        baseUrl: "https://compatible.example/v1/",
        promptVersion: "single-trade-local-v2",
        proxyUrl: "http://127.0.0.1:7890",
      },
      { secretCodec },
    );

    const summary = getSettingsSummary(db, paths, { env: {}, secretCodec });

    expect(summary.openAi).toEqual({
      apiKeyConfigured: true,
      apiKeySource: "local",
      model: "gpt-local",
      modelSource: "local",
      baseUrl: "https://compatible.example/v1",
      baseUrlSource: "local",
      promptVersion: "single-trade-local-v2",
      promptVersionSource: "local",
      proxyUrl: "http://127.0.0.1:7890",
      proxySource: "local",
    });
    expect(JSON.stringify(summary)).not.toContain("sk-local-secret");

    db.close();
  });

  it("falls back to environment and defaults when local settings are missing", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);

    const summary = getSettingsSummary(db, paths, {
      env: {
        OPENAI_API_KEY: "sk-env-secret",
        OPENAI_MODEL: "gpt-env",
        OPENAI_BASE_URL: "https://environment.example/api",
        HTTPS_PROXY: "http://127.0.0.1:7891",
      },
      secretCodec,
    });

    expect(summary.openAi).toEqual({
      apiKeyConfigured: true,
      apiKeySource: "environment",
      model: "gpt-env",
      modelSource: "environment",
      baseUrl: "https://environment.example/api",
      baseUrlSource: "environment",
      promptVersion: "single-trade-ai-v2",
      promptVersionSource: "default",
      proxyUrl: "http://127.0.0.1:7891",
      proxySource: "environment",
    });
    expect(summary.paths).toEqual(paths);

    db.close();
  });

  it("returns decrypted adapter config and can clear the local API key", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);

    saveAISettings(
      db,
      {
        apiKey: "sk-local-secret",
        model: "gpt-local",
        baseUrl: "https://compatible.example",
        promptVersion: "single-trade-local-v2",
        proxyUrl: "socks5://127.0.0.1:7890",
      },
      { secretCodec },
    );

    expect(getOpenAIAdapterConfig(db, { env: {}, secretCodec })).toEqual({
      apiKey: "sk-local-secret",
      model: "gpt-local",
      baseUrl: "https://compatible.example",
      promptVersion: "single-trade-local-v2",
      proxyUrl: "socks5://127.0.0.1:7890",
    });

    saveAISettings(db, { clearApiKey: true }, { secretCodec });

    expect(getOpenAIAdapterConfig(db, { env: {}, secretCodec }).apiKey).toBe("");
    expect(
      getSettingsSummary(db, paths, { env: {}, secretCodec }).openAi.apiKeySource,
    ).toBe("missing");

    db.close();
  });

  it("rejects invalid API Base URLs before changing other settings", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);

    expect(() =>
      saveAISettings(db, {
        model: "must-not-be-saved",
        baseUrl: "file:///tmp/openai",
      }),
    ).toThrow("must use http or https");
    expect(getOpenAIAdapterConfig(db, { env: {} })).toEqual(
      expect.objectContaining({
        model: "gpt-5.5",
        baseUrl: "https://api.openai.com/v1",
      }),
    );

    db.close();
  });

  it("rejects invalid proxy URLs without changing the saved proxy", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);

    saveAISettings(db, { proxyUrl: "http://127.0.0.1:7890" });

    expect(() =>
      saveAISettings(db, {
        model: "must-not-be-saved",
        proxyUrl: "file:///tmp/proxy",
      }),
    ).toThrow("must use http, https, socks4, or socks5");
    expect(getOpenAIAdapterConfig(db, { env: {} }).proxyUrl).toBe(
      "http://127.0.0.1:7890",
    );
    expect(getOpenAIAdapterConfig(db, { env: {} }).model).toBe("gpt-5.5");

    db.close();
  });
});
