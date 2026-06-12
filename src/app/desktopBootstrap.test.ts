import { describe, expect, it } from "vitest";
import { loadDesktopBootstrapState } from "./desktopBootstrap";

describe("loadDesktopBootstrapState", () => {
  it("loads all desktop startup data and formats database status", async () => {
    const desktopApi = {
      database: {
        getStatus: async () => ({
          databasePath: "/tmp/app.sqlite",
          appDataDir: "/tmp",
          instrumentCount: 4,
          migrationVersion: 1,
        }),
        listInstruments: async () => [
          {
            id: 1,
            symbol: "ES",
            name: "E-mini S&P 500",
            assetClass: "futures",
            exchange: "CME",
            currency: "USD",
            tickSize: 0.25,
            tickValue: 12.5,
            pointValue: 50,
          },
        ],
      },
      trades: {
        list: async () => [
          {
            id: 1,
            symbol: "ES",
            instrumentName: "E-mini S&P 500",
            direction: "long",
            status: "closed",
            openedAt: "2026-06-08T14:41:00.000Z",
            closedAt: "2026-06-08T15:20:00.000Z",
            entryPriceAvg: 5300,
            exitPriceAvg: 5304.5,
            quantity: 2,
            feesTotal: 5,
            grossPnl: 450,
            netPnl: 445,
            riskAmount: 200,
            rMultiple: 2.225,
            entryRuleId: null,
            entryRuleVersionId: null,
            entryRuleName: null,
            entryRuleVersionNo: null,
            aiReviewStatus: "needs_review",
          },
        ],
      },
      rules: {
        listActive: async () => [],
      },
      stats: {
        getOverview: async () => ({
          totalTradeCount: 1,
          confirmedReviewCount: 0,
          totalNetPnl: 0,
          winRate: null,
          averageRMultiple: null,
          profitFactor: null,
          totalFees: 0,
          byInstrument: [],
        }),
      },
      settings: {
        getSummary: async () => ({
          openAi: {
            apiKeyConfigured: false,
            apiKeySource: "missing",
            model: "gpt-4.1-mini",
            modelSource: "default",
            promptVersion: "default",
            promptVersionSource: "default",
          },
          paths: {
            appDataDir: "/tmp",
            databasePath: "/tmp/app.sqlite",
            attachmentsDir: "/tmp/attachments",
            backupsDir: "/tmp/backups",
          },
        }),
      },
      backup: {
        listHistory: async () => [],
      },
    } as unknown as DesktopApi;

    const state = await loadDesktopBootstrapState(desktopApi);

    expect(state.databaseStatus).toBe("SQLite v1 / 4 个品种");
    expect(state.trades).toHaveLength(1);
    expect(state.instruments[0].symbol).toBe("ES");
    expect(state.backupHistory).toEqual([]);
  });
});
