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

export type BackupHistoryItem = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
  backupSchemaVersion: number | null;
  appVersion: string | null;
  exportedAt: string | null;
  status: "restorable" | "unsupported-version" | "invalid";
  problem: string | null;
};

export type BackupPanelInput = {
  runtime: DesktopApi["runtime"] | "browser-preview";
  isBusy: boolean;
  lastBackup: BackupResult | null;
  lastRestore: RestoreBackupResult | null;
  backupHistory?: BackupHistoryItem[];
  error?: string | null;
};

export function getBackupPanelState({
  runtime,
  isBusy,
  lastBackup,
  lastRestore,
  backupHistory = [],
  error = null,
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
    versionPolicyLabel: "当前支持备份包 v1；更高版本会阻止恢复。",
    errorGuidance: error ? getErrorGuidance(error) : null,
    historyItems: backupHistory.map(formatHistoryItem),
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

function formatHistoryItem(item: BackupHistoryItem) {
  return {
    ...item,
    metadataLabel: [
      item.exportedAt ? formatBackupDate(item.exportedAt) : "未知导出时间",
      item.backupSchemaVersion === null ? "未知版本" : `v${item.backupSchemaVersion}`,
      formatBytes(item.sizeBytes),
    ].join(" / "),
    statusLabel: getHistoryStatusLabel(item.status),
    statusTone: getHistoryStatusTone(item.status),
  };
}

function getHistoryStatusLabel(status: BackupHistoryItem["status"]) {
  if (status === "restorable") {
    return "可恢复";
  }

  if (status === "unsupported-version") {
    return "版本过新";
  }

  return "无法读取";
}

function getHistoryStatusTone(status: BackupHistoryItem["status"]) {
  if (status === "restorable") {
    return "ok";
  }

  if (status === "unsupported-version") {
    return "warning";
  }

  return "danger";
}

function getErrorGuidance(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes("checksum mismatch")) {
    return "备份包校验失败。请换用历史列表中的其他备份，或从备份目录复制该 zip 后再排查文件是否被改动。";
  }

  if (normalized.includes("schema version") || normalized.includes("not supported")) {
    return "备份包版本暂不支持。请保留该 zip，升级应用后再尝试恢复，或选择历史列表中的 v1 备份。";
  }

  if (normalized.includes("missing manifest") || normalized.includes("manifest.json")) {
    return "这不是完整备份包。请选择由本应用导出的 zip，或从备份历史中选择 manifest 正常的文件。";
  }

  return "请确认备份 zip 位于本机可访问位置；如果失败发生在恢复过程中，当前数据会先保留安全备份。";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
