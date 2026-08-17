import type {
  AttachExistingFileInput,
  ChooseAndAttachInput,
  TradeAttachment,
} from "./attachmentContracts.js";
import type {
  BackupHistoryItem,
  BackupResult,
  RestoreBackupResult,
  RestoreFromHistoryInput,
} from "./backupContracts.js";
import type {
  DatabaseStatus,
  InstrumentConfig,
} from "./databaseContracts.js";
import type {
  CreateEntryRuleInput,
  CreateEntryRuleVersionInput,
  EntryRuleVersion,
  EntryRuleWithLatestVersion,
} from "./ruleContracts.js";
import type {
  AIReview,
  CorrectReviewInput,
  CreateReviewDraftInput,
  UpdateRuleCheckInput,
  UpdatedRuleCheck,
} from "./reviewContracts.js";
import type {
  AISettingsInput,
  DataResetInput,
  DataResetResult,
  SettingsSummary,
} from "./settingsContracts.js";
import type {
  StatsOverview,
  StatsOverviewFilters,
} from "./statsContracts.js";
import type {
  AssignTradeTagInput,
  CreateTagInput,
  DeleteTagResult,
  TagDefinition,
  TradeTagAssignment,
} from "./tagContracts.js";
import type {
  CreateClosedTradeInput,
  TradeDetail,
  TradeSummary,
} from "./tradeContracts.js";

export type { TradeDirection } from "../trading/types.js";
export type { JsonObject } from "./commonContracts.js";
export type {
  DatabaseStatus,
  InstrumentConfig,
} from "./databaseContracts.js";
export type {
  CreateClosedTradeInput,
  TradeDetail,
  TradeExecutionDetail,
  TradeSummary,
} from "./tradeContracts.js";
export type {
  CreateEntryRuleInput,
  CreateEntryRuleVersionInput,
  EntryRuleStatus,
  EntryRuleVersion,
  EntryRuleWithLatestVersion,
} from "./ruleContracts.js";
export type {
  AIReview,
  AIReviewScoreBreakdown,
  CorrectReviewInput,
  CreateReviewDraftInput,
  ReviewStatus,
  RuleCheckResult,
  TradeRuleCheckDetail,
  UpdatedRuleCheck,
  UpdateRuleCheckInput,
} from "./reviewContracts.js";
export {
  supportedAttachmentImageTypes,
} from "./attachmentContracts.js";
export type {
  AttachExistingFileInput,
  AttachmentImageType,
  ChooseAndAttachInput,
  TradeAttachment,
} from "./attachmentContracts.js";
export type {
  InstrumentStats,
  StatsDateBasis,
  StatsOverview,
  StatsOverviewFilters,
  TagCategory,
  TagSummary,
} from "./statsContracts.js";
export type {
  BackupHistoryItem,
  BackupManifest,
  BackupManifestFile,
  BackupResult,
  RestoreBackupResult,
  RestoreFromHistoryInput,
} from "./backupContracts.js";
export type {
  AISettingsInput,
  DataResetInput,
  DataResetResult,
  SettingsSummary,
} from "./settingsContracts.js";
export type {
  AssignTradeTagInput,
  CreateTagInput,
  DeleteTagResult,
  TagDefinition,
  TagSource,
  TradeTagAssignment,
} from "./tagContracts.js";

export type DesktopApi = {
  runtime: "electron";
  platform: string;
  database: {
    getStatus: () => Promise<DatabaseStatus>;
    listInstruments: () => Promise<InstrumentConfig[]>;
  };
  trades: {
    list: () => Promise<TradeSummary[]>;
    get: (id: number) => Promise<TradeDetail | undefined>;
    update: (
      id: number,
      input: CreateClosedTradeInput,
    ) => Promise<TradeSummary | undefined>;
    delete: (id: number) => Promise<boolean>;
    createClosed: (input: CreateClosedTradeInput) => Promise<TradeSummary>;
  };
  rules: {
    listActive: () => Promise<EntryRuleWithLatestVersion[]>;
    create: (
      input: CreateEntryRuleInput,
    ) => Promise<EntryRuleWithLatestVersion>;
    createVersion: (
      input: CreateEntryRuleVersionInput,
    ) => Promise<EntryRuleVersion>;
    archive: (id: number) => Promise<boolean>;
  };
  reviews: {
    createDraft: (input: CreateReviewDraftInput) => Promise<AIReview>;
    generateDraft: (tradeId: number) => Promise<AIReview>;
    getLatestForTrade: (tradeId: number) => Promise<AIReview | undefined>;
    confirm: (id: number) => Promise<AIReview>;
    correct: (id: number, input: CorrectReviewInput) => Promise<AIReview>;
    invalidate: (id: number) => Promise<AIReview>;
    updateRuleCheck: (
      id: number,
      input: UpdateRuleCheckInput,
    ) => Promise<UpdatedRuleCheck>;
  };
  stats: {
    getOverview: (filters?: StatsOverviewFilters) => Promise<StatsOverview>;
  };
  tags: {
    list: () => Promise<TagDefinition[]>;
    create: (input: CreateTagInput) => Promise<TagDefinition>;
    delete: (tagId: number) => Promise<DeleteTagResult>;
    listForTrade: (tradeId: number) => Promise<TradeTagAssignment[]>;
    assignManual: (input: AssignTradeTagInput) => Promise<TradeTagAssignment>;
    removeFromTrade: (input: AssignTradeTagInput) => Promise<boolean>;
  };
  backup: {
    create: () => Promise<BackupResult>;
    listHistory: () => Promise<BackupHistoryItem[]>;
    chooseAndRestore: () => Promise<RestoreBackupResult | undefined>;
    restoreFromHistory: (
      input: RestoreFromHistoryInput,
    ) => Promise<RestoreBackupResult>;
    openDataDirectory: () => Promise<string>;
    openBackupsDirectory: () => Promise<string>;
  };
  settings: {
    getSummary: () => Promise<SettingsSummary>;
    saveAI: (input: AISettingsInput) => Promise<SettingsSummary>;
    resetLocalData: (input: DataResetInput) => Promise<DataResetResult>;
    openDataDirectory: () => Promise<string>;
    openBackupsDirectory: () => Promise<string>;
  };
  attachments: {
    listByTrade: (tradeId: number) => Promise<TradeAttachment[]>;
    attachExistingFile: (
      input: AttachExistingFileInput,
    ) => Promise<TradeAttachment>;
    chooseAndAttach: (
      input: ChooseAndAttachInput,
    ) => Promise<TradeAttachment | undefined>;
    readImageDataUrl: (id: number) => Promise<string>;
    delete: (id: number) => Promise<boolean>;
  };
};
