/// <reference types="vite/client" />

type TradeDirection = "long" | "short";

type InstrumentConfig = {
  symbol: string;
  name: string;
  assetClass: "futures";
  exchange: string;
  currency: string;
  tickSize: number;
  tickValue: number;
  pointValue: number;
};

type CreateClosedTradeInput = {
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

type TradeSummary = {
  id: number;
  symbol: string;
  instrumentName: string;
  direction: TradeDirection;
  status: "closed";
  openedAt: string;
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
  aiReviewStatus:
    | "not_generated"
    | "draft"
    | "needs_review"
    | "confirmed"
    | "corrected"
    | "invalid";
};

type TradeExecutionDetail = {
  id: number;
  executedAt: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string | null;
  executionType: "entry" | "exit" | "add" | "reduce";
};

type TradeRuleCheckDetail = {
  id: number;
  entryRuleVersionId: number;
  checkItem: string;
  result: "pass" | "fail" | "unknown";
  evidence: string | null;
  comment: string | null;
  scoreDelta: number | null;
  createdAt: string;
};

type TradeDetail = TradeSummary & {
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

type EntryRuleVersion = {
  id: number;
  entryRuleId: number;
  versionNo: number;
  content: string;
  checklist: string[];
  createdAt: string;
};

type EntryRuleWithLatestVersion = {
  id: number;
  name: string;
  description: string | null;
  marketType: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  latestVersion: EntryRuleVersion;
};

type CreateEntryRuleInput = {
  name: string;
  description?: string | null;
  marketType?: string | null;
  content: string;
  checklist?: string[];
};

type CreateEntryRuleVersionInput = {
  entryRuleId: number;
  content: string;
  checklist?: string[];
};

type ReviewStatus =
  | "draft"
  | "needs_review"
  | "confirmed"
  | "corrected"
  | "invalid";

type AIReview = {
  id: number;
  tradeId: number;
  status: ReviewStatus;
  model: string | null;
  promptVersion: string | null;
  ruleVersionSnapshot: string | null;
  scoreTotal: number | null;
  summary: string | null;
  facts: Record<string, unknown>;
  missingInfo: unknown[];
  imageObservations: unknown[];
  strengths: unknown[];
  weaknesses: unknown[];
  suggestions: unknown[];
  tags: unknown[];
  confidence: number | null;
  rawResult: Record<string, unknown>;
  createdAt: string;
  confirmedAt: string | null;
};

type CreateReviewDraftInput = {
  tradeId: number;
  model?: string | null;
  promptVersion?: string | null;
  ruleVersionSnapshot?: string | null;
  scoreTotal?: number | null;
  summary?: string | null;
  facts?: Record<string, unknown>;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: Record<string, unknown>;
};

type CorrectReviewInput = {
  summary?: string | null;
  facts?: Record<string, unknown>;
  missingInfo?: unknown[];
  imageObservations?: unknown[];
  strengths?: unknown[];
  weaknesses?: unknown[];
  suggestions?: unknown[];
  tags?: unknown[];
  confidence?: number | null;
  rawResult?: Record<string, unknown>;
};

type UpdateRuleCheckInput = {
  result: TradeRuleCheckDetail["result"];
  evidence?: string | null;
  comment?: string | null;
};

type AttachmentImageType =
  | "before_entry"
  | "entry"
  | "holding"
  | "exit"
  | "review_marked";

type TradeAttachment = {
  id: number;
  tradeId: number;
  imageType: AttachmentImageType;
  filePath: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

type InstrumentStats = {
  symbol: string;
  instrumentName: string;
  tradeCount: number;
  netPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  feesTotal: number;
};

type StatsOverview = {
  totalTradeCount: number;
  confirmedReviewCount: number;
  totalNetPnl: number;
  winRate: number | null;
  averageRMultiple: number | null;
  profitFactor: number | null;
  totalFees: number;
  byInstrument: InstrumentStats[];
};

type StatsOverviewFilters = {
  symbol?: string;
  entryRuleId?: number;
  openedFrom?: string;
  openedBefore?: string;
};

type BackupManifestFile = {
  path: string;
  sha256: string;
  bytes: number;
};

type BackupManifest = {
  backupSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  databaseFile: string;
  attachments: BackupManifestFile[];
  files: BackupManifestFile[];
};

type BackupResult = {
  filePath: string;
  manifest: BackupManifest;
};

type RestoreBackupResult = {
  restoredFromFilePath: string;
  safetyBackupFilePath: string;
  manifest: BackupManifest;
};

type SettingsSummary = {
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

type AISettingsInput = {
  apiKey?: string | null;
  clearApiKey?: boolean;
  model?: string | null;
  promptVersion?: string | null;
};

type AttachExistingFileInput = {
  tradeId: number;
  sourceFilePath: string;
  imageType: AttachmentImageType;
  caption?: string | null;
  sortOrder?: number;
};

type ChooseAndAttachInput = Omit<AttachExistingFileInput, "sourceFilePath">;

type DesktopApi = {
  runtime: "electron";
  platform: string;
  database: {
    getStatus: () => Promise<{
      databasePath: string;
      appDataDir: string;
      instrumentCount: number;
      migrationVersion: number;
    }>;
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
    ) => Promise<TradeRuleCheckDetail & { tradeId: number }>;
  };
  stats: {
    getOverview: (filters?: StatsOverviewFilters) => Promise<StatsOverview>;
  };
  backup: {
    create: () => Promise<BackupResult>;
    chooseAndRestore: () => Promise<RestoreBackupResult | undefined>;
    openDataDirectory: () => Promise<string>;
    openBackupsDirectory: () => Promise<string>;
  };
  settings: {
    getSummary: () => Promise<SettingsSummary>;
    saveAI: (input: AISettingsInput) => Promise<SettingsSummary>;
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

interface Window {
  desktopApi?: DesktopApi;
}
