export type SettingsDraft = {
  apiKey: string;
  clearApiKey: boolean;
  model: string;
  promptVersion: string;
};

export type DataResetDraft = {
  confirmationText: string;
};

export type SettingsPanelInput = {
  runtime: DesktopApi["runtime"] | "browser-preview";
  isSaving: boolean;
  isResetting?: boolean;
  summary: SettingsSummary | null;
  resetConfirmationText?: string;
};

export function createSettingsDraft(summary: SettingsSummary | null): SettingsDraft {
  return {
    apiKey: "",
    clearApiKey: false,
    model: summary?.openAi.model ?? "gpt-5.5",
    promptVersion: summary?.openAi.promptVersion ?? "single-trade-ai-v1",
  };
}

export function getSettingsPanelState({
  runtime,
  isSaving,
  isResetting = false,
  summary,
  resetConfirmationText = "",
}: SettingsPanelInput) {
  const isPreview = runtime !== "electron";

  return {
    isPreview,
    canSave: !isPreview && !isSaving,
    canResetLocalData:
      !isPreview && !isResetting && resetConfirmationText === "DELETE",
    apiKeyStatusLabel: formatApiKeyStatus(summary?.openAi.apiKeySource),
    modelSourceLabel: formatSource(summary?.openAi.modelSource),
    promptVersionSourceLabel: formatSource(summary?.openAi.promptVersionSource),
  };
}

export function createDataResetDraft(): DataResetDraft {
  return {
    confirmationText: "",
  };
}

export function buildAISettingsInput(draft: SettingsDraft): AISettingsInput {
  const input: AISettingsInput = {
    clearApiKey: draft.clearApiKey,
    model: draft.model.trim(),
    promptVersion: draft.promptVersion.trim(),
  };

  if (!draft.clearApiKey && draft.apiKey.trim()) {
    input.apiKey = draft.apiKey.trim();
  }

  return input;
}

export function buildDataResetInput(draft: DataResetDraft): DataResetInput {
  return {
    confirmationText: draft.confirmationText,
  };
}

function formatApiKeyStatus(source: SettingsSummary["openAi"]["apiKeySource"] | undefined) {
  if (source === "local") {
    return "已保存在本机";
  }

  if (source === "environment") {
    return "来自环境变量";
  }

  return "未配置";
}

function formatSource(source: string | undefined) {
  if (source === "local") {
    return "本机设置";
  }

  if (source === "environment") {
    return "环境变量";
  }

  return "默认值";
}
