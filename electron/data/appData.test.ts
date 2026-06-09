import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureAppDataDirectories, resolveAppDataPaths } from "./appData";

const tempDirs: string[] = [];

function createTempUserDataDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-data-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("resolveAppDataPaths", () => {
  it("keeps database, attachments, and backups under the app userData directory", () => {
    const userDataDir = createTempUserDataDir();

    const paths = resolveAppDataPaths({
      getPath: () => userDataDir,
    });

    expect(paths).toEqual({
      appDataDir: userDataDir,
      databasePath: path.join(userDataDir, "app.sqlite"),
      attachmentsDir: path.join(userDataDir, "attachments"),
      backupsDir: path.join(userDataDir, "backups"),
    });
  });
});

describe("ensureAppDataDirectories", () => {
  it("creates attachment and backup directories", () => {
    const paths = resolveAppDataPaths({
      getPath: () => createTempUserDataDir(),
    });

    ensureAppDataDirectories(paths);

    expect(() => rmSync(paths.attachmentsDir, { recursive: true })).not.toThrow();
    expect(() => rmSync(paths.backupsDir, { recursive: true })).not.toThrow();
  });
});
