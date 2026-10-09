import { useRef } from "react";
import type { LucideIcon } from "lucide-react";

type Tab<T extends string> = { id: T; label: string; icon: LucideIcon };

export function WorkspaceTabs<T extends string>({ id, tabs, activeTab, onChange }: {
  id: string;
  tabs: Tab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="workspace-tabs" role="tablist" aria-label="交易详情分区">
      {tabs.map(({ id: tabId, label, icon: Icon }, index) => (
        <button
          key={tabId}
          ref={(button) => { buttons.current[index] = button; }}
          id={`${id}-tab-${tabId}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tabId}
          aria-controls={`${id}-panel-${tabId}`}
          tabIndex={activeTab === tabId ? 0 : -1}
          onClick={() => onChange(tabId)}
          onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
              : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
                : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
            if (next == null) return;
            event.preventDefault();
            onChange(tabs[next].id);
            buttons.current[next]?.focus();
          }}
        >
          <Icon aria-hidden="true" size={16} />{label}
        </button>
      ))}
    </div>
  );
}
