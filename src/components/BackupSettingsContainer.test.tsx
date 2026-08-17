import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createBackupSettingsInitialState } from "../app/backupSettingsWorkflow";
import { BackupSettingsContainer } from "./BackupSettingsContainer";

function createWorkflow() {
  return {
    state: createBackupSettingsInitialState(),
    actions: {
      applyBootstrapState: vi.fn(),
      applyBackupHistory: vi.fn(),
      setBackupLoadFailure: vi.fn(),
      clearLoadErrors: vi.fn(),
      setIsLoadingSettings: vi.fn(),
      setSettingsError: vi.fn(),
      setSettingsDraft: vi.fn(),
      setDataResetDraft: vi.fn(),
      handleCreateBackup: vi.fn(),
      handleRestoreBackup: vi.fn(),
      handleRestoreBackupFile: vi.fn(),
      handleOpenDataDirectory: vi.fn(),
      handleOpenBackupsDirectory: vi.fn(),
      handleSaveAISettings: vi.fn(),
      handleOpenSettingsDataDirectory: vi.fn(),
      handleOpenSettingsBackupsDirectory: vi.fn(),
      handleResetLocalData: vi.fn(),
    },
  };
}

describe("BackupSettingsContainer", () => {
  it("renders the backup view from the shared backup/settings workflow", () => {
    const workflow = createWorkflow();

    const html = renderToStaticMarkup(
      <BackupSettingsContainer
        view="backup"
        runtime="browser-preview"
        workflow={workflow}
      />,
    );

    expect(html).toContain("备份恢复");
    expect(html).toContain("导出完整备份");
  });

  it("renders the settings view from the shared backup/settings workflow", () => {
    const workflow = createWorkflow();

    const html = renderToStaticMarkup(
      <BackupSettingsContainer
        view="settings"
        runtime="browser-preview"
        workflow={workflow}
      />,
    );

    expect(html).toContain("设置");
    expect(html).toContain("AI Key 与模型");
    expect(html).toContain("OpenAI 代理");
  });
});
