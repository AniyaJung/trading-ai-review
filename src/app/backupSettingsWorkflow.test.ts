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
      "AI Key 不会回显；留空保存会保持当前 Key 不变。",
    );
  });

  it("keeps runtime unavailable messages centralized", () => {
    expect(getBackupRuntimeUnavailableError()).toBe(
      "浏览器预览不会访问本地数据目录；请在 Electron 桌面运行时操作。",
    );
    expect(getSettingsRuntimeUnavailableError("save")).toBe(
      "浏览器预览不会写入设置；请在 Electron 桌面运行时操作。",
    );
    expect(getSettingsRuntimeUnavailableError("reset")).toBe(
      "浏览器预览不会重置本地数据；请在 Electron 桌面运行时操作。",
    );
  });

  it("builds destructive-operation confirmation messages", () => {
    expect(getRestoreBackupConfirmationMessage()).toContain("从备份恢复会完整替换");
    expect(
      getRestoreBackupConfirmationMessage(
        "/Users/demo/backups/ai-trading-review-backup.zip",
      ),
    ).toContain("ai-trading-review-backup.zip");
    expect(getLocalDataResetConfirmationMessage()).toContain("清除本地 SQLite");
  });

  it("can be used with an injected confirm function", () => {
    const confirm = vi.fn<(message: string) => boolean>(() => true);

    const accepted = confirm(getRestoreBackupConfirmationMessage("/tmp/a.zip"));

    expect(accepted).toBe(true);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("a.zip"));
  });
});
