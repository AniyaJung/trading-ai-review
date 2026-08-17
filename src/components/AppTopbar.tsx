import { ArrowLeft, FilePlus2, RefreshCw, Save } from "lucide-react";
import type { AppView, NavigationItem } from "../app/views";
import type { RuleWorkspaceMode } from "../app/ruleWorkflow";

type AppTopbarProps = {
  activeView: NavigationItem | undefined;
  currentView: AppView;
  isTradeFormOpen: boolean;
  editingTradeId: number | null;
  isSavingTrade: boolean;
  isLoadingRules: boolean;
  isSavingRule: boolean;
  ruleWorkspaceMode: RuleWorkspaceMode;
  onSaveTrade: () => void;
  onStartCreateTrade: () => void;
  onCancelEdit: () => void;
  onSaveRule: () => void;
  onStartCreateRule: () => void;
  onCancelRuleEdit: () => void;
  onRefreshRules: () => void;
};

export function AppTopbar({
  activeView,
  currentView,
  isTradeFormOpen,
  editingTradeId,
  isSavingTrade,
  isLoadingRules,
  isSavingRule,
  ruleWorkspaceMode,
  onSaveTrade,
  onStartCreateTrade,
  onCancelEdit,
  onSaveRule,
  onStartCreateRule,
  onCancelRuleEdit,
  onRefreshRules,
}: AppTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeView?.description}</p>
        <h2>{activeView?.label}</h2>
      </div>
      <div className="toolbar">
        {currentView === "trades" && !isTradeFormOpen ? (
          <button
            type="button"
            className="primary-button"
            onClick={onStartCreateTrade}
          >
            <FilePlus2 aria-hidden="true" size={17} />
            新建交易
          </button>
        ) : currentView === "trades" ? (
          <>
            <button
              type="button"
              className="primary-button"
              onClick={onSaveTrade}
              disabled={isSavingTrade}
            >
              <Save aria-hidden="true" size={17} />
              {isSavingTrade
                ? "正在保存"
                : editingTradeId == null
                  ? "保存交易"
                  : "更新交易"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelEdit}
              disabled={isSavingTrade}
            >
              <ArrowLeft aria-hidden="true" size={17} />
              返回交易列表
            </button>
          </>
        ) : currentView === "rules" && ruleWorkspaceMode === "browse" ? (
          <>
            <button
              type="button"
              className="primary-button"
              onClick={onStartCreateRule}
            >
              <FilePlus2 aria-hidden="true" size={17} />
              新建规则
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onRefreshRules}
              disabled={isLoadingRules}
            >
              <RefreshCw aria-hidden="true" size={17} />
              {isLoadingRules ? "刷新中" : "刷新规则"}
            </button>
          </>
        ) : currentView === "rules" ? (
          <>
            <button
              type="button"
              className="primary-button"
              onClick={onSaveRule}
              disabled={isSavingRule}
            >
              <Save aria-hidden="true" size={17} />
              {isSavingRule
                ? "正在保存"
                : ruleWorkspaceMode === "create"
                  ? "保存规则"
                  : "保存新版本"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelRuleEdit}
              disabled={isSavingRule}
            >
              <ArrowLeft aria-hidden="true" size={17} />
              返回规则库
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
