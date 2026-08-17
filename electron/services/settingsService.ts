import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import type {
  AISettingsInput,
  SettingsSummary,
} from "../../shared/contracts/desktopApi.js";

const defaultOpenAIModel = "gpt-5.5";
const defaultOpenAIBaseUrl = "https://api.openai.com/v1";
const defaultPromptVersion = "single-trade-ai-v2";

const settingKeys = {
  openAIApiKey: "openai.api_key",
  openAIModel: "openai.model",
  openAIBaseUrl: "openai.base_url",
  openAIPromptVersion: "openai.prompt_version",
  openAIProxyUrl: "openai.proxy_url",
} as const;

export type SettingsServicePaths = AppDataPaths;

export type SecretCodec = {
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
};

export type SettingsServiceOptions = {
  env?: NodeJS.ProcessEnv;
  secretCodec?: SecretCodec;
};

export type {
  AISettingsInput,
  SettingsSummary,
} from "../../shared/contracts/desktopApi.js";

export type OpenAIAdapterConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  promptVersion: string;
  proxyUrl: string;
};

export function getSettingsSummary(
  db: DatabaseSync,
  paths: SettingsServicePaths,
  options: SettingsServiceOptions = {},
): SettingsSummary {
  const env = options.env ?? process.env;
  const localApiKey = getSetting(db, settingKeys.openAIApiKey);
  const localModel = getSetting(db, settingKeys.openAIModel);
  const localBaseUrl = getSetting(db, settingKeys.openAIBaseUrl);
  const localPromptVersion = getSetting(db, settingKeys.openAIPromptVersion);
  const localProxyUrl = getSetting(db, settingKeys.openAIProxyUrl);
  const envApiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const envModel = env.OPENAI_MODEL?.trim() ?? "";
  const envBaseUrl = env.OPENAI_BASE_URL?.trim() ?? "";
  const envProxyUrl = getEnvironmentProxyUrl(env);

  return {
    openAi: {
      apiKeyConfigured: Boolean(localApiKey || envApiKey),
      apiKeySource: localApiKey ? "local" : envApiKey ? "environment" : "missing",
      model: localModel ?? (envModel || defaultOpenAIModel),
      modelSource: localModel ? "local" : envModel ? "environment" : "default",
      baseUrl: validateBaseUrl(
        (localBaseUrl ?? envBaseUrl) || defaultOpenAIBaseUrl,
      ),
      baseUrlSource: localBaseUrl
        ? "local"
        : envBaseUrl
          ? "environment"
          : "default",
      promptVersion: localPromptVersion ?? defaultPromptVersion,
      promptVersionSource: localPromptVersion ? "local" : "default",
      proxyUrl: validateProxyUrl(localProxyUrl ?? envProxyUrl),
      proxySource: localProxyUrl
        ? "local"
        : envProxyUrl
          ? "environment"
          : "system",
    },
    paths,
  };
}

export function saveAISettings(
  db: DatabaseSync,
  input: AISettingsInput,
  options: SettingsServiceOptions = {},
) {
  const baseUrl =
    input.baseUrl === undefined ? undefined : validateBaseUrl(input.baseUrl);
  const proxyUrl =
    input.proxyUrl === undefined ? undefined : validateProxyUrl(input.proxyUrl);

  if (input.clearApiKey) {
    deleteSetting(db, settingKeys.openAIApiKey);
  } else if (input.apiKey != null) {
    const trimmedApiKey = input.apiKey.trim();

    if (trimmedApiKey) {
      setSetting(db, settingKeys.openAIApiKey, encryptSecret(trimmedApiKey, options));
    }
  }

  if (input.model !== undefined) {
    setOrDeleteTrimmed(db, settingKeys.openAIModel, input.model);
  }

  if (input.baseUrl !== undefined) {
    setOrDeleteTrimmed(db, settingKeys.openAIBaseUrl, baseUrl ?? "");
  }

  if (input.promptVersion !== undefined) {
    setOrDeleteTrimmed(db, settingKeys.openAIPromptVersion, input.promptVersion);
  }

  if (input.proxyUrl !== undefined) {
    setOrDeleteTrimmed(db, settingKeys.openAIProxyUrl, proxyUrl ?? "");
  }
}

export function getOpenAIAdapterConfig(
  db: DatabaseSync,
  options: SettingsServiceOptions = {},
): OpenAIAdapterConfig {
  const env = options.env ?? process.env;
  const encryptedApiKey = getSetting(db, settingKeys.openAIApiKey);
  const localModel = getSetting(db, settingKeys.openAIModel);
  const localBaseUrl = getSetting(db, settingKeys.openAIBaseUrl);
  const localPromptVersion = getSetting(db, settingKeys.openAIPromptVersion);
  const localProxyUrl = getSetting(db, settingKeys.openAIProxyUrl);

  return {
    apiKey: encryptedApiKey
      ? decryptSecret(encryptedApiKey, options)
      : env.OPENAI_API_KEY?.trim() ?? "",
    model: localModel ?? (env.OPENAI_MODEL?.trim() || defaultOpenAIModel),
    baseUrl: validateBaseUrl(
      (localBaseUrl ?? env.OPENAI_BASE_URL?.trim()) || defaultOpenAIBaseUrl,
    ),
    promptVersion: localPromptVersion ?? defaultPromptVersion,
    proxyUrl: validateProxyUrl(localProxyUrl ?? getEnvironmentProxyUrl(env)),
  };
}

export function validateBaseUrl(value: string | null | undefined) {
  const baseUrl = value?.trim() ?? "";

  if (!baseUrl) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("OpenAI API Base URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("OpenAI API Base URL must use http or https.");
  }

  if (!parsed.hostname) {
    throw new Error("OpenAI API Base URL must include a host.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export function validateProxyUrl(value: string | null | undefined) {
  const proxyUrl = value?.trim() ?? "";

  if (!proxyUrl) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new Error("OpenAI proxy must be a valid URL.");
  }

  if (!["http:", "https:", "socks4:", "socks5:"].includes(parsed.protocol)) {
    throw new Error(
      "OpenAI proxy must use http, https, socks4, or socks5.",
    );
  }

  if (!parsed.hostname) {
    throw new Error("OpenAI proxy must include a host.");
  }

  return proxyUrl;
}

function getEnvironmentProxyUrl(env: NodeJS.ProcessEnv) {
  return (
    env.HTTPS_PROXY?.trim() ||
    env.https_proxy?.trim() ||
    env.HTTP_PROXY?.trim() ||
    env.http_proxy?.trim() ||
    ""
  );
}

function setOrDeleteTrimmed(
  db: DatabaseSync,
  key: string,
  value: string | null,
) {
  const trimmedValue = value?.trim() ?? "";

  if (trimmedValue) {
    setSetting(db, key, trimmedValue);
  } else {
    deleteSetting(db, key);
  }
}

function getSetting(db: DatabaseSync, key: string) {
  const row = db
    .prepare("select value from app_setting where key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

function setSetting(db: DatabaseSync, key: string, value: string) {
  db.prepare(
    `insert into app_setting (key, value, updated_at)
     values (?, ?, datetime('now'))
     on conflict(key) do update set
       value = excluded.value,
       updated_at = excluded.updated_at`,
  ).run(key, value);
}

function deleteSetting(db: DatabaseSync, key: string) {
  db.prepare("delete from app_setting where key = ?").run(key);
}

function encryptSecret(value: string, options: SettingsServiceOptions) {
  return options.secretCodec?.encrypt(value) ?? value;
}

function decryptSecret(value: string, options: SettingsServiceOptions) {
  return options.secretCodec?.decrypt(value) ?? value;
}
