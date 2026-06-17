export type BackupManifestFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type BackupManifest = {
  backupSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  databaseFile: string;
  attachments: BackupManifestFile[];
  files: BackupManifestFile[];
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

export type RestoreFromHistoryInput = {
  filePath: string;
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
