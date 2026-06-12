import type { DatabaseSync } from "node:sqlite";
import type { AppDataPaths } from "../data/appData.js";
import type {
  AISettingsInput,
  SettingsSummary,
} from "../../shared/contracts/desktopApi.js";

const defaultOpenAIModel = "gpt-5.5";
const defaultPromptVersion = "single-trade-ai-v1";

const settingKeys = {
  openAIApiKey: "openai.api_key",
  openAIModel: "openai.model",
  openAIPromptVersion: "openai.prompt_version",
} as const;

export type SettingsServicePaths = AppDataPaths;

export type SecretCodec = {
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
};

export type SettingsServiceOptions = {
  env?: Pick<NodeJS.ProcessEnv, "OPENAI_API_KEY" | "OPENAI_MODEL">;
  secretCodec?: SecretCodec;
};

export type {
  AISettingsInput,
  SettingsSummary,
} from "../../shared/contracts/desktopApi.js";

export type OpenAIAdapterConfig = {
  apiKey: string;
  model: string;
  promptVersion: string;
};

export function getSettingsSummary(
  db: DatabaseSync,
  paths: SettingsServicePaths,
  options: SettingsServiceOptions = {},
): SettingsSummary {
  const env = options.env ?? process.env;
  const localApiKey = getSetting(db, settingKeys.openAIApiKey);
  const localModel = getSetting(db, settingKeys.openAIModel);
  const localPromptVersion = getSetting(db, settingKeys.openAIPromptVersion);
  const envApiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const envModel = env.OPENAI_MODEL?.trim() ?? "";

  return {
    openAi: {
      apiKeyConfigured: Boolean(localApiKey || envApiKey),
      apiKeySource: localApiKey ? "local" : envApiKey ? "environment" : "missing",
      model: localModel ?? (envModel || defaultOpenAIModel),
      modelSource: localModel ? "local" : envModel ? "environment" : "default",
      promptVersion: localPromptVersion ?? defaultPromptVersion,
      promptVersionSource: localPromptVersion ? "local" : "default",
    },
    paths,
  };
}

export function saveAISettings(
  db: DatabaseSync,
  input: AISettingsInput,
  options: SettingsServiceOptions = {},
) {
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

  if (input.promptVersion !== undefined) {
    setOrDeleteTrimmed(db, settingKeys.openAIPromptVersion, input.promptVersion);
  }
}

export function getOpenAIAdapterConfig(
  db: DatabaseSync,
  options: SettingsServiceOptions = {},
): OpenAIAdapterConfig {
  const env = options.env ?? process.env;
  const encryptedApiKey = getSetting(db, settingKeys.openAIApiKey);
  const localModel = getSetting(db, settingKeys.openAIModel);
  const localPromptVersion = getSetting(db, settingKeys.openAIPromptVersion);

  return {
    apiKey: encryptedApiKey
      ? decryptSecret(encryptedApiKey, options)
      : env.OPENAI_API_KEY?.trim() ?? "",
    model: localModel ?? (env.OPENAI_MODEL?.trim() || defaultOpenAIModel),
    promptVersion: localPromptVersion ?? defaultPromptVersion,
  };
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
