export type {
  BackupHistoryItem,
  BackupManifest,
  BackupResult,
  RestoreBackupResult,
} from "../../shared/contracts/desktopApi";

import type {
  BackupHistoryItem,
  BackupResult,
  RestoreBackupResult,
} from "../../shared/contracts/desktopApi";

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
      ? "当前是浏览器预览，无法访问本机数据目录。"
      : "备份会打包本地数据库、交易截图和备份说明文件。",
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
    versionPolicyLabel: "当前可恢复 v1 备份；更高版本请先升级应用。",
    errorGuidance: error ? getErrorGuidance(error) : null,
    historyItems: backupHistory.map((item) =>
      formatHistoryItem(item, {
        canUseLocalFiles: !isPreview && !isBusy,
      }),
    ),
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

function formatHistoryItem(
  item: BackupHistoryItem,
  options: { canUseLocalFiles: boolean },
) {
  return {
    ...item,
    canRestore: options.canUseLocalFiles && item.status === "restorable",
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
    return "可以恢复";
  }

  if (status === "unsupported-version") {
    return "需要升级";
  }

  return "读取失败";
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
    return "备份文件可能已被改动或损坏。建议换用历史列表中的其他备份，或先复制该 zip 再排查。";
  }

  if (normalized.includes("schema version") || normalized.includes("not supported")) {
    return "这个备份来自更高版本。请先保留该 zip，升级应用后再恢复，或改用 v1 备份。";
  }

  if (normalized.includes("missing manifest") || normalized.includes("manifest.json")) {
    return "这不是完整备份包。请选择本应用导出的 zip，或从备份历史中选择可恢复的文件。";
  }

  return "请确认备份 zip 仍在本机可访问位置。若恢复已开始，当前数据会先保留一份安全备份。";
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
