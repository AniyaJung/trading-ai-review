import { FolderOpen, KeyRound, Save, SlidersHorizontal } from "lucide-react";
import {
  getSettingsPanelState,
  type SettingsDraft,
} from "../app/settingsPanel";

type SettingsViewProps = {
  runtime: DesktopApi["runtime"] | "browser-preview";
  summary: SettingsSummary | null;
  draft: SettingsDraft;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  message: string;
  onDraftChange: (draft: SettingsDraft) => void;
  onSaveAI: () => void;
  onOpenDataDirectory: () => void;
  onOpenBackupsDirectory: () => void;
};

export function SettingsView({
  runtime,
  summary,
  draft,
  isLoading,
  isSaving,
  error,
  message,
  onDraftChange,
  onSaveAI,
  onOpenDataDirectory,
  onOpenBackupsDirectory,
}: SettingsViewProps) {
  const panel = getSettingsPanelState({ runtime, isSaving, summary });

  return (
    <section className="settings-view">
      <div className="stats-heading">
        <div>
          <p className="eyebrow">Local preferences</p>
          <h3>设置</h3>
        </div>
        {panel.isPreview ? <span className="stats-badge">预览模式</span> : null}
      </div>

      {error ? <div className="form-status error">读取设置失败：{error}</div> : null}
      <div className="form-status">{isLoading ? "设置加载中..." : message}</div>

      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">AI review</p>
            <h3>AI Key 与模型</h3>
          </div>
          <KeyRound aria-hidden="true" size={19} />
        </div>

        <div className="settings-form-grid">
          <label className="wide-field">
            OpenAI API Key
            <input
              type="password"
              value={draft.apiKey}
              placeholder={
                summary?.openAi.apiKeyConfigured
                  ? "已配置；留空则保持不变"
                  : "sk-..."
              }
              disabled={draft.clearApiKey}
              onChange={(event) =>
                onDraftChange({ ...draft, apiKey: event.target.value })
              }
            />
          </label>

          <label>
            AI 模型
            <input
              value={draft.model}
              onChange={(event) =>
                onDraftChange({ ...draft, model: event.target.value })
              }
            />
          </label>

          <label>
            Prompt 版本
            <input
              value={draft.promptVersion}
              onChange={(event) =>
                onDraftChange({ ...draft, promptVersion: event.target.value })
              }
            />
          </label>

          <label className="settings-checkbox wide-field">
            <input
              type="checkbox"
              checked={draft.clearApiKey}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  clearApiKey: event.target.checked,
                  apiKey: event.target.checked ? "" : draft.apiKey,
                })
              }
            />
            清除本机保存的 API Key
          </label>
        </div>

        <div className="settings-status-grid">
          <div>
            <span>API Key</span>
            <strong>{panel.apiKeyStatusLabel}</strong>
          </div>
          <div>
            <span>模型来源</span>
            <strong>{panel.modelSourceLabel}</strong>
          </div>
          <div>
            <span>Prompt 来源</span>
            <strong>{panel.promptVersionSourceLabel}</strong>
          </div>
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onSaveAI}
            disabled={!panel.canSave}
          >
            <Save aria-hidden="true" size={17} />
            {isSaving ? "保存中" : "保存 AI 设置"}
          </button>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Storage</p>
            <h3>本地路径</h3>
          </div>
          <SlidersHorizontal aria-hidden="true" size={19} />
        </div>

        <div className="settings-path-list">
          <div>
            <span>数据目录</span>
            <strong>{summary?.paths.appDataDir ?? "桌面运行时可用"}</strong>
          </div>
          <div>
            <span>SQLite</span>
            <strong>{summary?.paths.databasePath ?? "桌面运行时可用"}</strong>
          </div>
          <div>
            <span>截图目录</span>
            <strong>{summary?.paths.attachmentsDir ?? "桌面运行时可用"}</strong>
          </div>
          <div>
            <span>备份目录</span>
            <strong>{summary?.paths.backupsDir ?? "桌面运行时可用"}</strong>
          </div>
        </div>

        <div className="backup-directory-panel">
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
        </div>
      </section>
    </section>
  );
}
