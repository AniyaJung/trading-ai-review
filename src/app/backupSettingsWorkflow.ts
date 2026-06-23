import { useCallback, useState } from "react";
import {
  buildAISettingsInput,
  buildDataResetInput,
  createDataResetDraft,
  createSettingsDraft,
  type DataResetDraft,
  type SettingsDraft,
} from "./settingsPanel";

const defaultSettingsMessage =
  "API Key 只保存在本机，不会在输入框中回显；留空保存会沿用当前 Key。";

export type BackupSettingsWorkflowState = {
  isBackupBusy: boolean;
  backupError: string | null;
  lastBackup: BackupResult | null;
  lastRestore: RestoreBackupResult | null;
  backupHistory: BackupHistoryItem[];
  settingsSummary: SettingsSummary | null;
  settingsDraft: SettingsDraft;
  dataResetDraft: DataResetDraft;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  isResettingLocalData: boolean;
  settingsError: string | null;
  settingsMessage: string;
};

export type BackupSettingsBootstrapState = {
  settingsSummary: SettingsSummary;
};

export function createBackupSettingsInitialState(): BackupSettingsWorkflowState {
  return {
    isBackupBusy: false,
    backupError: null,
    lastBackup: null,
    lastRestore: null,
    backupHistory: [],
    settingsSummary: null,
    settingsDraft: createSettingsDraft(null),
    dataResetDraft: createDataResetDraft(),
    isLoadingSettings: false,
    isSavingSettings: false,
    isResettingLocalData: false,
    settingsError: null,
    settingsMessage: defaultSettingsMessage,
  };
}

export function getBackupRuntimeUnavailableError() {
  return "当前是浏览器预览，无法访问本机数据目录；请在桌面应用中操作。";
}

export function getSettingsRuntimeUnavailableError(action: "save" | "reset") {
  return action === "save"
    ? "当前是浏览器预览，无法保存设置；请在桌面应用中操作。"
    : "当前是浏览器预览，无法重置本地数据；请在桌面应用中操作。";
}

export function getRestoreBackupConfirmationMessage(filePath?: string) {
  if (!filePath) {
    return "恢复备份会替换当前本地数据库和截图目录。开始前会自动保存当前数据快照，恢复后应用会重启。继续恢复？";
  }

  const fileName = filePath.split(/[\\/]/).at(-1) ?? filePath;
  return `从历史备份 ${fileName} 恢复会替换当前本地数据库和截图目录。开始前会自动保存当前数据快照，恢复后应用会重启。继续恢复？`;
}

export function getLocalDataResetConfirmationMessage() {
  return "重置会先自动导出当前数据备份，然后清空本地交易、截图和设置，并重启应用。确认重置？";
}

export function useBackupSettingsWorkflow(
  desktopApi: DesktopApi | undefined,
  confirmAction: (message: string) => boolean = window.confirm,
) {
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
  const [lastRestore, setLastRestore] = useState<RestoreBackupResult | null>(
    null,
  );
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [settingsSummary, setSettingsSummary] =
    useState<SettingsSummary | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() =>
    createSettingsDraft(null),
  );
  const [dataResetDraft, setDataResetDraft] = useState<DataResetDraft>(() =>
    createDataResetDraft(),
  );
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResettingLocalData, setIsResettingLocalData] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState(defaultSettingsMessage);

  const applyBootstrapState = useCallback(
    ({ settingsSummary: nextSettingsSummary }: BackupSettingsBootstrapState) => {
      setSettingsSummary(nextSettingsSummary);
      setSettingsDraft(createSettingsDraft(nextSettingsSummary));
    },
    [],
  );

  const applyBackupHistory = useCallback((history: BackupHistoryItem[]) => {
    setBackupHistory(history);
    setBackupError(null);
  }, []);

  const setBackupLoadFailure = useCallback((error: string) => {
    setBackupError(error);
  }, []);

  const clearLoadErrors = useCallback(() => {
    setBackupError(null);
    setSettingsError(null);
  }, []);

  const handleCreateBackup = async () => {
    if (!desktopApi) {
      setBackupError(getBackupRuntimeUnavailableError());
      return;
    }

    setIsBackupBusy(true);
    setBackupError(null);
    try {
      const backup = await desktopApi.backup.create();
      setLastBackup(backup);
      setBackupHistory(await desktopApi.backup.listHistory());
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!desktopApi) {
      setBackupError(getBackupRuntimeUnavailableError());
      return;
    }

    if (!confirmAction(getRestoreBackupConfirmationMessage())) {
      return;
    }

    setIsBackupBusy(true);
    setBackupError(null);
    try {
      const restored = await desktopApi.backup.chooseAndRestore();
      if (restored) {
        setLastRestore(restored);
      }
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleRestoreBackupFile = async (filePath: string) => {
    if (!desktopApi) {
      setBackupError(getBackupRuntimeUnavailableError());
      return;
    }

    if (!confirmAction(getRestoreBackupConfirmationMessage(filePath))) {
      return;
    }

    setIsBackupBusy(true);
    setBackupError(null);
    try {
      const restored = await desktopApi.backup.restoreFromHistory({ filePath });
      setLastRestore(restored);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleOpenDataDirectory = async () => {
    try {
      const error = await desktopApi?.backup.openDataDirectory();
      setBackupError(error || null);
    } catch (openError) {
      setBackupError(
        openError instanceof Error ? openError.message : String(openError),
      );
    }
  };

  const handleOpenBackupsDirectory = async () => {
    try {
      const error = await desktopApi?.backup.openBackupsDirectory();
      setBackupError(error || null);
    } catch (openError) {
      setBackupError(
        openError instanceof Error ? openError.message : String(openError),
      );
    }
  };

  const handleSaveAISettings = async () => {
    if (!desktopApi) {
      setSettingsError(getSettingsRuntimeUnavailableError("save"));
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const summary = await desktopApi.settings.saveAI(
        buildAISettingsInput(settingsDraft),
      );
      setSettingsSummary(summary);
      setSettingsDraft(createSettingsDraft(summary));
      setSettingsMessage("AI 设置已保存，下一次生成复盘会使用这些配置。");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenSettingsDataDirectory = async () => {
    try {
      const error = await desktopApi?.settings.openDataDirectory();
      setSettingsError(error || null);
    } catch (openError) {
      setSettingsError(
        openError instanceof Error ? openError.message : String(openError),
      );
    }
  };

  const handleOpenSettingsBackupsDirectory = async () => {
    try {
      const error = await desktopApi?.settings.openBackupsDirectory();
      setSettingsError(error || null);
    } catch (openError) {
      setSettingsError(
        openError instanceof Error ? openError.message : String(openError),
      );
    }
  };

  const handleResetLocalData = async () => {
    if (!desktopApi) {
      setSettingsError(getSettingsRuntimeUnavailableError("reset"));
      return;
    }

    if (!confirmAction(getLocalDataResetConfirmationMessage())) {
      return;
    }

    setIsResettingLocalData(true);
    setSettingsError(null);
    try {
      await desktopApi.settings.resetLocalData(
        buildDataResetInput(dataResetDraft),
      );
      setDataResetDraft(createDataResetDraft());
      setSettingsMessage("本地数据已重置，应用即将重启。");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsResettingLocalData(false);
    }
  };

  return {
    state: {
      isBackupBusy,
      backupError,
      lastBackup,
      lastRestore,
      backupHistory,
      settingsSummary,
      settingsDraft,
      dataResetDraft,
      isLoadingSettings,
      isSavingSettings,
      isResettingLocalData,
      settingsError,
      settingsMessage,
    },
    actions: {
      applyBootstrapState,
      applyBackupHistory,
      setBackupLoadFailure,
      clearLoadErrors,
      setIsLoadingSettings,
      setSettingsError,
      setSettingsDraft,
      setDataResetDraft,
      handleCreateBackup,
      handleRestoreBackup,
      handleRestoreBackupFile,
      handleOpenDataDirectory,
      handleOpenBackupsDirectory,
      handleSaveAISettings,
      handleOpenSettingsDataDirectory,
      handleOpenSettingsBackupsDirectory,
      handleResetLocalData,
    },
  };
}

export type BackupSettingsWorkflow = ReturnType<typeof useBackupSettingsWorkflow>;
