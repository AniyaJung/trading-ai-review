import { describe, expect, it, vi } from "vitest";
import {
  createBackupSettingsInitialState,
  getBackupRuntimeUnavailableError,
  getRestoreBackupConfirmationMessage,
  getSettingsRuntimeUnavailableError,
  getLocalDataResetConfirmationMessage,
} from "./backupSettingsWorkflow";

describe("backupSettingsWorkflow", () => {
  it("creates the initial backup and settings state", () => {
    const state = createBackupSettingsInitialState();

    expect(state.backupHistory).toEqual([]);
    expect(state.lastBackup).toBeNull();
    expect(state.lastRestore).toBeNull();
    expect(state.settingsDraft.apiKey).toBe("");
    expect(state.dataResetDraft.confirmationText).toBe("");
    expect(state.settingsMessage).toBe(
      "API Key 只保存在本机，不会在输入框中回显；留空保存会沿用当前 Key。",
    );
  });

  it("keeps runtime unavailable messages centralized", () => {
    expect(getBackupRuntimeUnavailableError()).toBe(
      "当前是浏览器预览，无法访问本机数据目录；请在桌面应用中操作。",
    );
    expect(getSettingsRuntimeUnavailableError("save")).toBe(
      "当前是浏览器预览，无法保存设置；请在桌面应用中操作。",
    );
    expect(getSettingsRuntimeUnavailableError("reset")).toBe(
      "当前是浏览器预览，无法重置本地数据；请在桌面应用中操作。",
    );
  });

  it("builds destructive-operation confirmation messages", () => {
    expect(getRestoreBackupConfirmationMessage()).toContain("恢复备份会替换");
    expect(
      getRestoreBackupConfirmationMessage(
        "/Users/demo/backups/ai-trading-review-backup.zip",
      ),
    ).toContain("ai-trading-review-backup.zip");
    expect(getLocalDataResetConfirmationMessage()).toContain("清空本地交易");
  });

  it("can be used with an injected confirm function", () => {
    const confirm = vi.fn<(message: string) => boolean>(() => true);

    const accepted = confirm(getRestoreBackupConfirmationMessage("/tmp/a.zip"));

    expect(accepted).toBe(true);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("a.zip"));
  });
});
