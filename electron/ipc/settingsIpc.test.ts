import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
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
});
