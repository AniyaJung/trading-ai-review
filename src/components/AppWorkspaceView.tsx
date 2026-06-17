import type { ComponentProps } from "react";
import type { AppView } from "../app/views";
import { BackupView } from "./BackupView";
import { RulesView } from "./RulesView";
import { SettingsView } from "./SettingsView";
import { StatsView } from "./StatsView";
import { TradeDeskView } from "./TradeDeskView";

type AppWorkspaceViewProps = {
  currentView: AppView;
  rules: ComponentProps<typeof RulesView>;
  stats: ComponentProps<typeof StatsView>;
  backup: ComponentProps<typeof BackupView>;
  settings: ComponentProps<typeof SettingsView>;
  tradeDesk: ComponentProps<typeof TradeDeskView>;
};

export function AppWorkspaceView({
  currentView,
  rules,
  stats,
  backup,
  settings,
  tradeDesk,
}: AppWorkspaceViewProps) {
  if (currentView === "rules") {
    return <RulesView {...rules} />;
  }

  if (currentView === "stats") {
    return <StatsView {...stats} />;
  }

  if (currentView === "backup") {
    return <BackupView {...backup} />;
  }

  if (currentView === "settings") {
    return <SettingsView {...settings} />;
  }

  return <TradeDeskView {...tradeDesk} />;
}
