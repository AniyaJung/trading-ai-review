export type SettingsSummary = {
  openAi: {
    apiKeyConfigured: boolean;
    apiKeySource: "local" | "environment" | "missing";
    model: string;
    modelSource: "local" | "environment" | "default";
    promptVersion: string;
    promptVersionSource: "local" | "default";
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
  promptVersion?: string | null;
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
