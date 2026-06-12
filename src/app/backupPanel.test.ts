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

  it("summarizes backup history with version status labels", () => {
    const state = getBackupPanelState({
      runtime: "electron",
      isBusy: false,
      lastBackup: null,
      lastRestore: null,
      backupHistory: [
        {
          filePath: "/backups/current.zip",
          fileName: "current.zip",
          sizeBytes: 2048,
          modifiedAt: "2026-06-11T11:00:00.000Z",
          backupSchemaVersion: 1,
          appVersion: "0.0.1",
          exportedAt: "2026-06-11T10:30:00.000Z",
          status: "restorable",
          problem: null,
        },
        {
          filePath: "/backups/future.zip",
          fileName: "future.zip",
          sizeBytes: 1000,
          modifiedAt: "2026-06-11T10:00:00.000Z",
          backupSchemaVersion: 999,
          appVersion: "9.0.0",
          exportedAt: "2026-06-11T09:30:00.000Z",
          status: "unsupported-version",
          problem: "Backup schema version 999 is not supported.",
        },
      ],
    });

    expect(state.versionPolicyLabel).toBe("当前支持备份包 v1；更高版本会阻止恢复。");
    expect(state.historyItems).toEqual([
      expect.objectContaining({
        fileName: "current.zip",
        metadataLabel: "2026-06-11 10:30 / v1 / 2.0 KB",
        statusLabel: "可恢复",
        statusTone: "ok",
      }),
      expect.objectContaining({
        fileName: "future.zip",
        metadataLabel: "2026-06-11 09:30 / v999 / 1000 B",
        statusLabel: "版本过新",
        statusTone: "warning",
      }),
    ]);
  });

  it("maps restore failures to actionable guidance", () => {
    const state = getBackupPanelState({
      runtime: "electron",
      isBusy: false,
      lastBackup: null,
      lastRestore: null,
      error: "Backup archive checksum mismatch for attachments/entry.png.",
    });

    expect(state.errorGuidance).toBe(
      "备份包校验失败。请换用历史列表中的其他备份，或从备份目录复制该 zip 后再排查文件是否被改动。",
    );
  });
});
