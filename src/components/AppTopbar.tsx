import { Copy, Plus } from "lucide-react";
import type { AppView, NavigationItem } from "../app/views";

type AppTopbarProps = {
  activeView: NavigationItem | undefined;
  currentView: AppView;
  editingTradeId: number | null;
  isSavingTrade: boolean;
  isLoadingRules: boolean;
  onSaveTrade: () => void;
  onCancelEdit: () => void;
  onRefreshRules: () => void;
};

export function AppTopbar({
  activeView,
  currentView,
  editingTradeId,
  isSavingTrade,
  isLoadingRules,
  onSaveTrade,
  onCancelEdit,
  onRefreshRules,
}: AppTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeView?.description}</p>
        <h2>{activeView?.label}</h2>
      </div>
      <div className="toolbar">
        {currentView === "trades" ? (
          <>
            <button
              type="button"
              className="icon-button"
              title="复制当前交易待接入"
              disabled
            >
              <Copy aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={onSaveTrade}
              disabled={isSavingTrade}
            >
              <Plus aria-hidden="true" size={18} />
              {isSavingTrade
                ? "保存中"
                : editingTradeId == null
                  ? "保存已平仓交易"
                  : "更新已平仓交易"}
            </button>
            {editingTradeId != null ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancelEdit}
                disabled={isSavingTrade}
              >
                取消编辑
              </button>
            ) : null}
          </>
        ) : currentView === "rules" ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onRefreshRules}
            disabled={isLoadingRules}
          >
            {isLoadingRules ? "刷新中" : "刷新规则"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
