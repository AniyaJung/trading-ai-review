import { ChartCandlestick, ChevronRight, ShieldCheck } from "lucide-react";
import { navigationItems, type AppView } from "../app/views";

type AppSidebarProps = {
  currentView: AppView;
  desktopRuntime: string;
  onViewChange: (view: AppView) => void;
};

export function AppSidebar({
  currentView,
  desktopRuntime,
  onViewChange,
}: AppSidebarProps) {
  const hasLocalStorage = desktopRuntime === "electron";

  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <ChartCandlestick size={23} strokeWidth={2} />
        </div>
        <div>
          <p className="eyebrow">Review desk</p>
          <h1>交易复盘</h1>
        </div>
      </div>

      <nav className="nav-list">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={item.id === currentView ? "nav-item active" : "nav-item"}
              aria-current={item.id === currentView ? "page" : undefined}
              aria-label={item.label}
              title={item.description}
              onClick={() => onViewChange(item.id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className={
          currentView === "backup"
            ? "local-status-card active"
            : "local-status-card"
        }
        onClick={() => onViewChange("backup")}
        title="打开备份与恢复"
      >
        <ShieldCheck aria-hidden="true" size={18} />
        <div>
          <strong>{hasLocalStorage ? "本地数据正常" : "浏览器预览"}</strong>
          <span>{hasLocalStorage ? "备份与恢复" : "桌面版启用本地存储"}</span>
        </div>
        <ChevronRight
          className="local-status-arrow"
          aria-hidden="true"
          size={16}
        />
      </button>
    </aside>
  );
}
