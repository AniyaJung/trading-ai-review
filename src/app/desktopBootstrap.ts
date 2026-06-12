export type DesktopBootstrapState = {
  databaseStatus: string;
  trades: TradeSummary[];
  activeRules: EntryRuleWithLatestVersion[];
  instruments: InstrumentConfig[];
  statsOverview: StatsOverview;
  settingsSummary: SettingsSummary;
  backupHistory: BackupHistoryItem[];
};

export async function loadDesktopBootstrapState(
  desktopApi: DesktopApi,
): Promise<DesktopBootstrapState> {
  const [
    status,
    trades,
    activeRules,
    instruments,
    statsOverview,
    settingsSummary,
    backupHistory,
  ] = await Promise.all([
    desktopApi.database.getStatus(),
    desktopApi.trades.list(),
    desktopApi.rules.listActive(),
    desktopApi.database.listInstruments(),
    desktopApi.stats.getOverview({}),
    desktopApi.settings.getSummary(),
    desktopApi.backup.listHistory(),
  ]);

  return {
    databaseStatus: `SQLite v${status.migrationVersion} / ${status.instrumentCount} 个品种`,
    trades,
    activeRules,
    instruments,
    statsOverview,
    settingsSummary,
    backupHistory,
  };
}
