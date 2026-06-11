import { describe, expect, it } from "vitest";
import { getBackupPanelState } from "./backupPanel";

describe("getBackupPanelState", () => {
  it("disables local file actions in browser preview", () => {
    const state = getBackupPanelState({
      runtime: "browser-preview",
      isBusy: false,
      lastBackup: null,
      lastRestore: null,
    });

    expect(state.isPreview).toBe(true);
    expect(state.canCreateBackup).toBe(false);
    expect(state.canRestoreBackup).toBe(false);
    expect(state.statusText).toBe("浏览器预览不会访问本地数据目录。");
  });

  it("shows the last backup file name in Electron runtime", () => {
    const state = getBackupPanelState({
      runtime: "electron",
      isBusy: false,
      lastBackup: {
        filePath:
          "/Users/demo/Library/Application Support/AI Trading Review/backups/ai-trading-review-backup-2026.zip",
        manifest: {
          backupSchemaVersion: 1,
          appVersion: "0.0.0-test",
          exportedAt: "2026-06-11T10:00:00.000Z",
          databaseFile: "app.sqlite",
          attachments: [],
          files: [],
        },
      },
      lastRestore: null,
    });

    expect(state.canCreateBackup).toBe(true);
    expect(state.canRestoreBackup).toBe(true);
    expect(state.lastBackupLabel).toBe(
      "ai-trading-review-backup-2026.zip / 2026-06-11 10:00",
    );
  });
});
