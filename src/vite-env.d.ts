/// <reference types="vite/client" />

type TradeDirection = "long" | "short";

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

type TradeDetail = TradeSummary & {
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  backgroundNote: string | null;
  entryReason: string | null;
  exitReason: string | null;
  emotionNote: string | null;
  lessonNote: string | null;
  executions: TradeExecutionDetail[];
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
  attachments: {
    listByTrade: (tradeId: number) => Promise<TradeAttachment[]>;
    attachExistingFile: (
      input: AttachExistingFileInput,
    ) => Promise<TradeAttachment>;
    chooseAndAttach: (
      input: ChooseAndAttachInput,
    ) => Promise<TradeAttachment | undefined>;
    delete: (id: number) => Promise<boolean>;
  };
};

interface Window {
  desktopApi?: DesktopApi;
}
