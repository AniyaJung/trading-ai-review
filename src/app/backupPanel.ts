export type BackupManifest = {
  backupSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  databaseFile: string;
  attachments: Array<{
    path: string;
    sha256: string;
    bytes: number;
  }>;
  files: Array<{
    path: string;
    sha256: string;
    bytes: number;
  }>;
};

export type BackupResult = {
  filePath: string;
  manifest: BackupManifest;
};

export type RestoreBackupResult = {
  restoredFromFilePath: string;
  safetyBackupFilePath: string;
  manifest: BackupManifest;
};

export type BackupPanelInput = {
  runtime: DesktopApi["runtime"] | "browser-preview";
  isBusy: boolean;
  lastBackup: BackupResult | null;
  lastRestore: RestoreBackupResult | null;
};

export function getBackupPanelState({
  runtime,
  isBusy,
  lastBackup,
  lastRestore,
}: BackupPanelInput) {
  const isPreview = runtime !== "electron";

  return {
    isPreview,
    canCreateBackup: !isPreview && !isBusy,
    canRestoreBackup: !isPreview && !isBusy,
    statusText: isPreview
      ? "浏览器预览不会访问本地数据目录。"
      : "备份会包含 SQLite 数据库、交易截图和 manifest。",
    lastBackupLabel: lastBackup
      ? `${getFileName(lastBackup.filePath)} / ${formatBackupDate(
          lastBackup.manifest.exportedAt,
        )}`
      : null,
    lastRestoreLabel: lastRestore
      ? `${getFileName(lastRestore.restoredFromFilePath)} / 安全备份 ${getFileName(
          lastRestore.safetyBackupFilePath,
        )}`
      : null,
  };
}

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).at(-1) ?? filePath;
}

function formatBackupDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 16).replace("T", " ");
}
