import type { BackupSettingsWorkflow } from "../app/backupSettingsWorkflow";
import { BackupView } from "./BackupView";
import { SettingsView } from "./SettingsView";

type BackupSettingsContainerProps = {
  view: "backup" | "settings";
  runtime: DesktopApi["runtime"] | "browser-preview";
  workflow: BackupSettingsWorkflow;
};

export function BackupSettingsContainer({
  view,
  runtime,
  workflow,
}: BackupSettingsContainerProps) {
  const {
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
  } = workflow.state;
  const {
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
  } = workflow.actions;

  if (view === "backup") {
    return (
      <BackupView
        runtime={runtime}
        isBusy={isBackupBusy}
        error={backupError}
        lastBackup={lastBackup}
        lastRestore={lastRestore}
        backupHistory={backupHistory}
        onCreateBackup={() => void handleCreateBackup()}
        onRestoreBackup={() => void handleRestoreBackup()}
        onRestoreBackupFile={(filePath) =>
          void handleRestoreBackupFile(filePath)
        }
        onOpenDataDirectory={() => void handleOpenDataDirectory()}
        onOpenBackupsDirectory={() => void handleOpenBackupsDirectory()}
      />
    );
  }

  return (
    <SettingsView
      runtime={runtime}
      summary={settingsSummary}
      draft={settingsDraft}
      dataResetDraft={dataResetDraft}
      isLoading={isLoadingSettings}
      isSaving={isSavingSettings}
      isResettingLocalData={isResettingLocalData}
      error={settingsError}
      message={settingsMessage}
      onDraftChange={setSettingsDraft}
      onDataResetDraftChange={setDataResetDraft}
      onSaveAI={() => void handleSaveAISettings()}
      onResetLocalData={() => void handleResetLocalData()}
      onOpenDataDirectory={() => void handleOpenSettingsDataDirectory()}
      onOpenBackupsDirectory={() => void handleOpenSettingsBackupsDirectory()}
    />
  );
}
