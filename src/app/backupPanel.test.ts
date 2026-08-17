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
    expect(state.statusText).toBe("当前是浏览器预览，无法访问本机数据目录。");
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
      timeZone: "Asia/Shanghai",
    });

    expect(state.canCreateBackup).toBe(true);
    expect(state.canRestoreBackup).toBe(true);
    expect(state.lastBackupLabel).toBe(
      "ai-trading-review-backup-2026.zip / 2026-06-11 18:00",
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
      timeZone: "Asia/Shanghai",
    });

    expect(state.versionPolicyLabel).toBe("当前可恢复 v1 备份；更高版本请先升级应用。");
    expect(state.historyItems).toEqual([
      expect.objectContaining({
        canRestore: true,
        fileName: "current.zip",
        metadataLabel: "2026-06-11 18:30 / v1 / 2.0 KB",
        statusLabel: "可以恢复",
        statusTone: "ok",
      }),
      expect.objectContaining({
        canRestore: false,
        fileName: "future.zip",
        metadataLabel: "2026-06-11 17:30 / v999 / 1000 B",
        statusLabel: "需要升级",
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
      "备份文件可能已被改动或损坏。建议换用历史列表中的其他备份，或先复制该 zip 再排查。",
    );
  });

  it("disables history restore actions while busy and in browser preview", () => {
    const backupHistory = [
      {
        filePath: "/backups/current.zip",
        fileName: "current.zip",
        sizeBytes: 2048,
        modifiedAt: "2026-06-11T11:00:00.000Z",
        backupSchemaVersion: 1,
        appVersion: "0.0.1",
        exportedAt: "2026-06-11T10:30:00.000Z",
        status: "restorable" as const,
        problem: null,
      },
    ];

    expect(
      getBackupPanelState({
        runtime: "electron",
        isBusy: true,
        lastBackup: null,
        lastRestore: null,
        backupHistory,
      }).historyItems[0].canRestore,
    ).toBe(false);
    expect(
      getBackupPanelState({
        runtime: "electron",
        isBusy: true,
        lastBackup: null,
        lastRestore: null,
        backupHistory,
      }).historyItems[0].restoreDisabledReason,
    ).toBe("备份或恢复正在处理中，请稍候。");
    expect(
      getBackupPanelState({
        runtime: "browser-preview",
        isBusy: false,
        lastBackup: null,
        lastRestore: null,
        backupHistory,
      }).historyItems[0].canRestore,
    ).toBe(false);
    expect(
      getBackupPanelState({
        runtime: "browser-preview",
        isBusy: false,
        lastBackup: null,
        lastRestore: null,
        backupHistory,
      }).historyItems[0].restoreDisabledReason,
    ).toBe("请在桌面应用中恢复备份。");
  });

  it("explains why unsupported history backups cannot be restored", () => {
    const state = getBackupPanelState({
      runtime: "electron",
      isBusy: false,
      lastBackup: null,
      lastRestore: null,
      backupHistory: [
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

    expect(state.historyItems[0]).toEqual(
      expect.objectContaining({
        canRestore: false,
        restoreDisabledReason: "Backup schema version 999 is not supported.",
      }),
    );
  });
});
