import type { ComponentProps } from "react";
import type { AppView } from "../app/views";
import { BackupSettingsContainer } from "./BackupSettingsContainer";
import { RulesViewContainer } from "./RulesViewContainer";
import { StatsViewContainer } from "./StatsViewContainer";
import { TagManagerContainer } from "./TagManagerContainer";
import { TradeDeskView } from "./TradeDeskView";

type AppWorkspaceViewProps = {
  currentView: AppView;
  rules: ComponentProps<typeof RulesViewContainer>;
  stats: ComponentProps<typeof StatsViewContainer>;
  tags: ComponentProps<typeof TagManagerContainer>;
  backupSettings: Omit<
    ComponentProps<typeof BackupSettingsContainer>,
    "view"
  >;
  tradeDesk: ComponentProps<typeof TradeDeskView>;
};

export function AppWorkspaceView({
  currentView,
  rules,
  stats,
  tags,
  backupSettings,
  tradeDesk,
}: AppWorkspaceViewProps) {
  if (currentView === "rules") {
    return <RulesViewContainer {...rules} />;
  }

  if (currentView === "stats") {
    return <StatsViewContainer {...stats} />;
  }

  if (currentView === "tags") {
    return <TagManagerContainer {...tags} />;
  }

  if (currentView === "backup" || currentView === "settings") {
    return <BackupSettingsContainer view={currentView} {...backupSettings} />;
  }

  return <TradeDeskView {...tradeDesk} />;
}
