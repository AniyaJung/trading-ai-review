/// <reference types="vite/client" />

import type {
  AIReview as SharedAIReview,
  AISettingsInput as SharedAISettingsInput,
  AttachmentImageType as SharedAttachmentImageType,
  AttachExistingFileInput as SharedAttachExistingFileInput,
  BackupHistoryItem as SharedBackupHistoryItem,
  BackupManifest as SharedBackupManifest,
  BackupManifestFile as SharedBackupManifestFile,
  BackupResult as SharedBackupResult,
  ChooseAndAttachInput as SharedChooseAndAttachInput,
  CorrectReviewInput as SharedCorrectReviewInput,
  CreateClosedTradeInput as SharedCreateClosedTradeInput,
  CreateEntryRuleInput as SharedCreateEntryRuleInput,
  CreateEntryRuleVersionInput as SharedCreateEntryRuleVersionInput,
  CreateReviewDraftInput as SharedCreateReviewDraftInput,
  DataResetInput as SharedDataResetInput,
  DataResetResult as SharedDataResetResult,
  DesktopApi as SharedDesktopApi,
  EntryRuleVersion as SharedEntryRuleVersion,
  EntryRuleWithLatestVersion as SharedEntryRuleWithLatestVersion,
  InstrumentConfig as SharedInstrumentConfig,
  InstrumentStats as SharedInstrumentStats,
  RestoreBackupResult as SharedRestoreBackupResult,
  RestoreFromHistoryInput as SharedRestoreFromHistoryInput,
  ReviewStatus as SharedReviewStatus,
  SettingsSummary as SharedSettingsSummary,
  StatsOverview as SharedStatsOverview,
  StatsOverviewFilters as SharedStatsOverviewFilters,
  TradeAttachment as SharedTradeAttachment,
  TradeDetail as SharedTradeDetail,
  TradeDirection as SharedTradeDirection,
  TradeExecutionDetail as SharedTradeExecutionDetail,
  TradeRuleCheckDetail as SharedTradeRuleCheckDetail,
  TradeSummary as SharedTradeSummary,
  UpdateRuleCheckInput as SharedUpdateRuleCheckInput,
} from "../shared/contracts/desktopApi";

declare global {
  type TradeDirection = SharedTradeDirection;
  type InstrumentConfig = SharedInstrumentConfig;
  type CreateClosedTradeInput = SharedCreateClosedTradeInput;
  type TradeSummary = SharedTradeSummary;
  type TradeExecutionDetail = SharedTradeExecutionDetail;
  type TradeRuleCheckDetail = SharedTradeRuleCheckDetail;
  type TradeDetail = SharedTradeDetail;
  type EntryRuleVersion = SharedEntryRuleVersion;
  type EntryRuleWithLatestVersion = SharedEntryRuleWithLatestVersion;
  type CreateEntryRuleInput = SharedCreateEntryRuleInput;
  type CreateEntryRuleVersionInput = SharedCreateEntryRuleVersionInput;
  type ReviewStatus = SharedReviewStatus;
  type AIReview = SharedAIReview;
  type CreateReviewDraftInput = SharedCreateReviewDraftInput;
  type CorrectReviewInput = SharedCorrectReviewInput;
  type UpdateRuleCheckInput = SharedUpdateRuleCheckInput;
  type AttachmentImageType = SharedAttachmentImageType;
  type TradeAttachment = SharedTradeAttachment;
  type InstrumentStats = SharedInstrumentStats;
  type StatsOverview = SharedStatsOverview;
  type StatsOverviewFilters = SharedStatsOverviewFilters;
  type BackupManifestFile = SharedBackupManifestFile;
  type BackupManifest = SharedBackupManifest;
  type BackupResult = SharedBackupResult;
  type RestoreBackupResult = SharedRestoreBackupResult;
  type RestoreFromHistoryInput = SharedRestoreFromHistoryInput;
  type BackupHistoryItem = SharedBackupHistoryItem;
  type SettingsSummary = SharedSettingsSummary;
  type AISettingsInput = SharedAISettingsInput;
  type DataResetInput = SharedDataResetInput;
  type DataResetResult = SharedDataResetResult;
  type AttachExistingFileInput = SharedAttachExistingFileInput;
  type ChooseAndAttachInput = SharedChooseAndAttachInput;
  type DesktopApi = SharedDesktopApi;

  interface Window {
    desktopApi?: DesktopApi;
  }
}

export {};
