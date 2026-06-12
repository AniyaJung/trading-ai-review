import type { TradeDirection } from "../trading/types.js";

export type { TradeDirection } from "../trading/types.js";

export type JsonObject = Record<string, unknown>;

export type InstrumentConfig = {
  symbol: string;
  name: string;
  assetClass: "futures";
  exchange: string;
  currency: string;
  tickSize: number;
  tickValue: number;
  pointValue: number;
};

export type DatabaseStatus = {
  databasePath: string;
  appDataDir: string;
  instrumentCount: number;
  migrationVersion: number;
};

export type CreateClosedTradeInput = {
  symbol: string;
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLossPrice: number;
  takeProfitPrice?: number | null;
  feesTotal: number;
  backgroundNote?: string | null;
  entryReason?: string | null;
  exitReason?: string | null;
  emotionNote?: string | null;
  lessonNote?: string | null;
  entryRuleVersionId?: number | null;
};

export type ReviewStatus =
  | "draft"
  | "needs_review"
  | "confirmed"
  | "corrected"
  | "invalid";

export type TradeSummary = {
  id: number;
  symbol: string;
  instrumentName: string;
  direction: TradeDirection;
  status: "closed";
  openedAt: string;
  userLocalDate?: string;
  marketSessionDate?: string;
  closedAt: string;
  entryPriceAvg: number;
  exitPriceAvg: number;
  quantity: number;
  feesTotal: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rMultiple: number | null;
  entryRuleId: number | null;
  entryRuleVersionId: number | null;
  entryRuleName: string | null;
  entryRuleVersionNo: number | null;
  aiReviewStatus: "not_generated" | ReviewStatus;
};

export type TradeExecutionDetail = {
  id: number;
  executedAt: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string | null;
  executionType: "entry" | "exit" | "add" | "reduce";
};

export type RuleCheckResult = "pass" | "fail" | "unknown";

export type TradeRuleCheckDetail = {
  id: number;
  entryRuleVersionId: number;
  checkItem: string;
  result: RuleCheckResult;
  evidence: string | null;
  comment: string | null;
  scoreDelta: number | null;
  createdAt: string;
};

export type TradeDetail = TradeSummary & {
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  backgroundNote: string | null;
  entryReason: string | null;
  exitReason: string | null;
  emotionNote: string | null;
  lessonNote: string | null;
  entryRuleContent: string | null;
  entryRuleChecklist: string[];
  ruleChecks: TradeRuleCheckDetail[];
  executions: TradeExecutionDetail[];
};

export type EntryRuleStatus = "active" | "archived";

export type EntryRuleVersion = {
  id: number;
  entryRuleId: number;
  versionNo: number;
  content: string;
  checklist: string[];
  createdAt: string;
};

export type EntryRuleWithLatestVersion = {
  id: number;
  name: string;
  description: string | null;
  marketType: string | null;
  status: EntryRuleStatus;
  createdAt: string;
  updatedAt: string;
  latestVersion: EntryRuleVersion;
};

export type CreateEntryRuleInput = {
  name: string;
  description?: string | null;
  marketType?: string | null;
  content: string;
  checklist?: string[];
};

export type CreateEntryRuleVersionInput = {
  entryRuleId: number;
  content: string;
  checklist?: string[];
};

export type AIReview = {
  id: number;
  tradeId: number;
  status: ReviewStatus;
  model: string | null;
  promptVersion: string | null;
  ruleVersionSnapshot: string | null;
  scoreTotal: number | null;
  summary: string | null;
  facts: JsonObject;
  missingInfo: unknown[];
  imageObservations: unknown[];
  strengths: unknown[];
  weaknesses: unknown[];
  suggestions: unknown[];
  tags: unknown[];
  confidence: number | null;
  rawResult: JsonObject;
  createdAt: string;
  confirmedAt: string | null;
};

export type CreateReviewDraftInput = {
  tradeId: number;
  model?: string | null;
  promptVersion?: string | null;
  ruleVersionSnapshot?: string | null;
  scoreTotal?: number | null;
  summary?: string | null;
  facts?: JsonObject;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: JsonObject;
};

export type CorrectReviewInput = {
  summary?: string | null;
  facts?: JsonObject;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: JsonObject;
};

export type UpdateRuleCheckInput = {
  result: RuleCheckResult;
  evidence?: string | null;
  comment?: string | null;
};

export type UpdatedRuleCheck = TradeRuleCheckDetail & {
  tradeId: number;
};

export const supportedAttachmentImageTypes = [
  "before_entry",
  "entry",
  "holding",
  "exit",
  "review_marked",
] as const;

export type AttachmentImageType = (typeof supportedAttachmentImageTypes)[number];

export type TradeAttachment = {
  id: number;
  tradeId: number;
  imageType: AttachmentImageType;
  filePath: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export type AttachExistingFileInput = {
  tradeId: number;
  sourceFilePath: string;
  imageType: AttachmentImageType;
  caption?: string | null;
  sortOrder?: number;
};

export type ChooseAndAttachInput = Omit<
  AttachExistingFileInput,
  "sourceFilePath"
>;

export type InstrumentStats = {
  symbol: string;
  instrumentName: string;
  tradeCount: number;
  netPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  feesTotal: number;
};

export type StatsOverview = {
  totalTradeCount: number;
  confirmedReviewCount: number;
  totalNetPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  totalFees: number;
  byInstrument: InstrumentStats[];
};

export type StatsDateBasis = "user_local_day" | "market_session_day";

export type StatsOverviewFilters = {
  symbol?: string | null;
  entryRuleId?: number | null;
  dateBasis?: StatsDateBasis | null;
  dateFrom?: string | null;
  dateBefore?: string | null;
  openedFrom?: string | null;
  openedBefore?: string | null;
};

export type BackupManifestFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type BackupManifest = {
  backupSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  databaseFile: string;
  attachments: BackupManifestFile[];
  files: BackupManifestFile[];
};

export type BackupResult = {
  filePath: string;
  manifest: BackupManifest;
};

export type RestoreBackupResult = {
  restoredFromFilePath: string;
  safetyBackupFilePath: string;
  manifest: BackupManifest;
};

export type RestoreFromHistoryInput = {
  filePath: string;
};

export type BackupHistoryItem = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
  backupSchemaVersion: number | null;
  appVersion: string | null;
  exportedAt: string | null;
  status: "restorable" | "unsupported-version" | "invalid";
  problem: string | null;
};

export type SettingsSummary = {
  openAi: {
    apiKeyConfigured: boolean;
    apiKeySource: "local" | "environment" | "missing";
    model: string;
    modelSource: "local" | "environment" | "default";
    promptVersion: string;
    promptVersionSource: "local" | "default";
  };
  paths: {
    appDataDir: string;
    databasePath: string;
    attachmentsDir: string;
    backupsDir: string;
  };
};

export type AISettingsInput = {
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  promptVersion?: string | null;
};

export type DataResetInput = {
  confirmationText: string;
};

export type DataResetResult = {
  safetyBackupFilePath: string;
  resetAt: string;
  databasePath: string;
  attachmentsDir: string;
};

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
