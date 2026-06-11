import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import { createRuleIpcHandlers } from "./ruleIpc";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-rule-ipc-"));
  tempDirs.push(dir);
  return initializeAppDatabase(path.join(dir, "app.sqlite"));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("createRuleIpcHandlers", () => {
  it("creates, versions, lists, and archives entry rules through narrow handlers", () => {
    const db = createTestDb();
    const handlers = createRuleIpcHandlers(db);

    expect(handlers.listActive()).toEqual([]);

    const created = handlers.create({
      name: "Opening range pullback",
      marketType: "index_futures",
      content: "Version one content",
      checklist: ["V1 item"],
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 1,
        name: "Opening range pullback",
        latestVersion: expect.objectContaining({
          versionNo: 1,
          content: "Version one content",
        }),
      }),
    );

    expect(
      handlers.createVersion({
        entryRuleId: created.id,
        content: "Version two content",
        checklist: ["V2 item"],
      }),
    ).toEqual(
      expect.objectContaining({
        entryRuleId: created.id,
        versionNo: 2,
        content: "Version two content",
      }),
    );
    expect(handlers.listActive()).toEqual([
      expect.objectContaining({
        id: created.id,
        latestVersion: expect.objectContaining({
          versionNo: 2,
        }),
      }),
    ]);
    expect(handlers.archive(created.id)).toBe(true);
    expect(handlers.listActive()).toEqual([]);

    db.close();
  });
});
