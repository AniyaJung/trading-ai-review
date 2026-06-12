import {
  Archive,
  DatabaseBackup,
  FolderOpen,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  getBackupPanelState,
  type BackupHistoryItem,
  type BackupResult,
  type RestoreBackupResult,
} from "../app/backupPanel";

type BackupViewProps = {
  runtime: DesktopApi["runtime"] | "browser-preview";
  isBusy: boolean;
  error: string | null;
  lastBackup: BackupResult | null;
  lastRestore: RestoreBackupResult | null;
  backupHistory: BackupHistoryItem[];
  onCreateBackup: () => void;
  onRestoreBackup: () => void;
  onRestoreBackupFile: (filePath: string) => void;
  onOpenDataDirectory: () => void;
  onOpenBackupsDirectory: () => void;
};

export function BackupView({
  runtime,
  isBusy,
  error,
  lastBackup,
  lastRestore,
  backupHistory,
  onCreateBackup,
  onRestoreBackup,
  onRestoreBackupFile,
  onOpenDataDirectory,
  onOpenBackupsDirectory,
}: BackupViewProps) {
  const panel = getBackupPanelState({
    runtime,
    isBusy,
    lastBackup,
    lastRestore,
    backupHistory,
    error,
  });

  return (
    <section className="backup-view">
      <div className="stats-heading">
        <div>
          <p className="eyebrow">Local data protection</p>
          <h3>备份恢复</h3>
        </div>
        {panel.isPreview ? <span className="stats-badge">预览模式</span> : null}
      </div>

      {error ? (
        <div className="form-status error backup-error-block">
          <strong>备份操作失败：{error}</strong>
          {panel.errorGuidance ? <span>{panel.errorGuidance}</span> : null}
        </div>
      ) : null}

      <div className="backup-action-grid">
        <section className="panel backup-action-panel">
          <div className="backup-action-icon">
            <DatabaseBackup aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="eyebrow">Export</p>
            <h3>导出完整备份</h3>
            <p>{panel.statusText}</p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={onCreateBackup}
            disabled={!panel.canCreateBackup}
          >
            <Archive aria-hidden="true" size={17} />
            {isBusy ? "处理中" : "立即备份"}
          </button>
        </section>

        <section className="panel backup-action-panel">
          <div className="backup-action-icon warning">
            <RotateCcw aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="eyebrow">Restore</p>
            <h3>从备份恢复</h3>
            <p>恢复会完整替换当前 SQLite 和截图目录，执行前会自动保存当前数据快照。</p>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={onRestoreBackup}
            disabled={!panel.canRestoreBackup}
          >
            <RotateCcw aria-hidden="true" size={17} />
            选择备份恢复
          </button>
        </section>
      </div>

      <section className="panel backup-status-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Latest activity</p>
            <h3>最近操作</h3>
          </div>
          <ShieldCheck aria-hidden="true" size={19} />
        </div>
        <div className="backup-status-list">
          <div>
            <span>最近备份</span>
            <strong>{panel.lastBackupLabel ?? "本次会话尚未导出备份"}</strong>
          </div>
          <div>
            <span>最近恢复</span>
            <strong>{panel.lastRestoreLabel ?? "本次会话尚未执行恢复"}</strong>
          </div>
        </div>
      </section>

      <section className="panel backup-history-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Backup history</p>
            <h3>备份历史</h3>
          </div>
          <span className="backup-version-policy">{panel.versionPolicyLabel}</span>
        </div>
        <div className="backup-history-list">
          {panel.historyItems.length > 0 ? (
            panel.historyItems.map((item) => (
              <div className="backup-history-row" key={item.filePath}>
                <div>
                  <strong>{item.fileName}</strong>
                  <span>{item.metadataLabel}</span>
                  {item.problem ? <small>{item.problem}</small> : null}
                </div>
                <span className={`backup-status-chip ${item.statusTone}`}>
                  {item.statusLabel}
                </span>
                <button
                  type="button"
                  className="danger-button backup-history-restore"
                  onClick={() => onRestoreBackupFile(item.filePath)}
                  disabled={!item.canRestore}
                >
                  <RotateCcw aria-hidden="true" size={15} />
                  恢复此备份
                </button>
              </div>
            ))
          ) : (
            <div className="backup-history-empty">
              {panel.isPreview ? "桌面运行时可读取备份历史" : "备份目录暂无 zip 记录"}
            </div>
          )}
        </div>
      </section>

      <section className="panel backup-directory-panel">
        <button
          type="button"
          className="secondary-button"
          onClick={onOpenDataDirectory}
          disabled={panel.isPreview}
        >
          <FolderOpen aria-hidden="true" size={17} />
          打开数据目录
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onOpenBackupsDirectory}
          disabled={panel.isPreview}
        >
          <FolderOpen aria-hidden="true" size={17} />
          打开备份目录
        </button>
      </section>
    </section>
  );
}
