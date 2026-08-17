export type SettingsSummary = {
  openAi: {
    apiKeyConfigured: boolean;
    apiKeySource: "local" | "environment" | "missing";
    model: string;
    modelSource: "local" | "environment" | "default";
    baseUrl: string;
    baseUrlSource: "local" | "environment" | "default";
    promptVersion: string;
    promptVersionSource: "local" | "default";
    proxyUrl: string;
    proxySource: "local" | "environment" | "system";
  };
  paths: {
    appDataDir: string;
    databasePath: string;
    attachmentsDir: string;
    backupsDir: string;
  };
};

export type AISettingsInput = {
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  baseUrl?: string | null;
  promptVersion?: string | null;
  proxyUrl?: string | null;
};

export type DataResetInput = {
  confirmationText: string;
};

export type DataResetResult = {
  safetyBackupFilePath: string;
  resetAt: string;
  databasePath: string;
  attachmentsDir: string;
};
