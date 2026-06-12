import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createClosedTrade } from "../services/tradeService";
import type { SettingsServicePaths } from "../services/settingsService";
import { createSettingsIpcHandlers } from "./settingsIpc";

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createPaths(): SettingsServicePaths {
  const appDataDir = createTempDir("trading-ai-review-settings-ipc-");
  return {
    appDataDir,
    databasePath: path.join(appDataDir, "app.sqlite"),
    attachmentsDir: path.join(appDataDir, "attachments"),
    backupsDir: path.join(appDataDir, "backups"),
  };
}

const secretCodec = {
  encrypt: (value: string) => `encrypted:${Buffer.from(value).toString("base64")}`,
  decrypt: (value: string) =>
    Buffer.from(value.replace(/^encrypted:/, ""), "base64").toString("utf8"),
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createSettingsIpcHandlers", () => {
  it("reads and saves AI settings without returning the API key", () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);
    const handlers = createSettingsIpcHandlers(db, paths, {
      env: {},
      secretCodec,
    });

    expect(handlers.getSummary().openAi.apiKeySource).toBe("missing");

    const summary = handlers.saveAI({
      apiKey: "sk-local-secret",
      model: "gpt-local",
      promptVersion: "single-trade-local-v2",
    });

    expect(summary.openAi.apiKeySource).toBe("local");
    expect(summary.openAi.model).toBe("gpt-local");
    expect(summary.openAi.promptVersion).toBe("single-trade-local-v2");
    expect(JSON.stringify(summary)).not.toContain("sk-local-secret");

    db.close();
  });

  it("opens app data and backup directories", async () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);
    const openedPaths: string[] = [];
    const handlers = createSettingsIpcHandlers(db, paths, {
      openPath: async (targetPath) => {
        openedPaths.push(targetPath);
        return "";
      },
    });

    await handlers.openDataDirectory();
    await handlers.openBackupsDirectory();

    expect(openedPaths).toEqual([paths.appDataDir, paths.backupsDir]);

    db.close();
  });

  it("resets local data after closing the active database", async () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);
    createClosedTrade(db, {
      symbol: "ES",
      direction: "long",
      openedAt: "2026-06-08T14:41:00.000Z",
      closedAt: "2026-06-08T15:20:00.000Z",
      entryPrice: 5300,
      exitPrice: 5304.5,
      quantity: 2,
      stopLossPrice: 5298,
      feesTotal: 5,
    });
    mkdirSync(paths.attachmentsDir, { recursive: true });
    writeFileSync(path.join(paths.attachmentsDir, "entry.png"), "screenshot");
    let closedDatabase = false;
    let afterResetCalled = false;
    const handlers = createSettingsIpcHandlers(db, paths, {
      appVersion: "0.0.0-test",
      now: () => new Date("2026-06-11T12:15:00.000Z"),
      closeDatabase: () => {
        closedDatabase = true;
        db.close();
      },
      afterReset: () => {
        afterResetCalled = true;
      },
    });

    const result = await handlers.resetLocalData({ confirmationText: "DELETE" });

    const resetDb = new DatabaseSync(paths.databasePath);
    const tradeCount = (
      resetDb.prepare("select count(*) as count from trade").get() as {
        count: number;
      }
    ).count;
    resetDb.close();

    expect(result.safetyBackupFilePath).toMatch(/before-reset\.zip$/);
    expect(closedDatabase).toBe(true);
    expect(afterResetCalled).toBe(true);
    expect(tradeCount).toBe(0);
  });

  it("does not close the database when reset confirmation is wrong", async () => {
    const paths = createPaths();
    const db = initializeAppDatabase(paths.databasePath);
    let closedDatabase = false;
    const handlers = createSettingsIpcHandlers(db, paths, {
      closeDatabase: () => {
        closedDatabase = true;
      },
    });

    await expect(
      handlers.resetLocalData({ confirmationText: "RESET" }),
    ).rejects.toThrow("Type DELETE to reset local data.");

    expect(closedDatabase).toBe(false);

    db.close();
  });
});
