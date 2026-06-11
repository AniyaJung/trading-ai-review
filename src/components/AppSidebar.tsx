import { ShieldCheck } from "lucide-react";
import { navigationItems, type AppView } from "../app/views";

type AppSidebarProps = {
  currentView: AppView;
  desktopRuntime: string;
  databaseStatus: string;
  onViewChange: (view: AppView) => void;
};

export function AppSidebar({
  currentView,
  desktopRuntime,
  databaseStatus,
  onViewChange,
}: AppSidebarProps) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand-block">
        <div className="brand-mark">AI</div>
        <div>
          <p className="eyebrow">Local review desk</p>
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
              title={item.description}
              onClick={() => onViewChange(item.id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sync-card">
        <ShieldCheck aria-hidden="true" size={18} />
        <div>
          <strong>本地优先</strong>
          <span>
            {desktopRuntime} / {databaseStatus}
          </span>
        </div>
      </div>
    </aside>
  );
}
