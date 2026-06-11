import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAppDatabase } from "../data/database";
import {
  archiveEntryRule,
  createEntryRule,
  createEntryRuleVersion,
  listActiveEntryRulesWithLatestVersion,
} from "./ruleService";

const tempDirs: string[] = [];

function createTestDb() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trading-ai-review-rules-"));
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

describe("createEntryRule", () => {
  it("creates an active rule with immutable version 1", () => {
    const db = createTestDb();

    const rule = createEntryRule(db, {
      name: "Opening range pullback",
      description: "Trade the first pullback after an opening range break.",
      marketType: "index_futures",
      content: "Break opening range, wait for retest, enter with defined stop.",
      checklist: ["Trend aligned", "Retest held", "Stop below structure"],
    });

    expect(rule).toEqual({
      id: 1,
      name: "Opening range pullback",
      description: "Trade the first pullback after an opening range break.",
      marketType: "index_futures",
      status: "active",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      latestVersion: {
        id: 1,
        entryRuleId: 1,
        versionNo: 1,
        content: "Break opening range, wait for retest, enter with defined stop.",
        checklist: ["Trend aligned", "Retest held", "Stop below structure"],
        createdAt: expect.any(String),
      },
    });

    expect(listActiveEntryRulesWithLatestVersion(db)).toEqual([rule]);

    db.close();
  });

  it("rejects blank names and content before inserting", () => {
    const db = createTestDb();

    expect(() =>
      createEntryRule(db, {
        name: " ",
        marketType: "index_futures",
        content: "Valid content",
        checklist: [],
      }),
    ).toThrow("Rule name is required.");
    expect(() =>
      createEntryRule(db, {
        name: "Opening range pullback",
        marketType: "index_futures",
        content: " ",
        checklist: [],
      }),
    ).toThrow("Rule version content is required.");
    expect(listActiveEntryRulesWithLatestVersion(db)).toEqual([]);

    db.close();
  });
});

describe("createEntryRuleVersion", () => {
  it("appends the next immutable version and keeps older versions unchanged", () => {
    const db = createTestDb();
    const created = createEntryRule(db, {
      name: "Opening range pullback",
      marketType: "index_futures",
      content: "Version one content",
      checklist: ["V1 item"],
    });

    const nextVersion = createEntryRuleVersion(db, {
      entryRuleId: created.id,
      content: "Version two content",
      checklist: ["V2 item A", "V2 item B"],
    });

    expect(nextVersion).toEqual({
      id: 2,
      entryRuleId: created.id,
      versionNo: 2,
      content: "Version two content",
      checklist: ["V2 item A", "V2 item B"],
      createdAt: expect.any(String),
    });
    expect(listActiveEntryRulesWithLatestVersion(db)).toEqual([
      {
        ...created,
        updatedAt: expect.any(String),
        latestVersion: nextVersion,
      },
    ]);
    expect(
      db
        .prepare(
          "select version_no as versionNo, content from entry_rule_version order by version_no",
        )
        .all(),
    ).toEqual([
      { versionNo: 1, content: "Version one content" },
      { versionNo: 2, content: "Version two content" },
    ]);

    db.close();
  });

  it("rejects versions for unknown or archived rules", () => {
    const db = createTestDb();
    const created = createEntryRule(db, {
      name: "Opening range pullback",
      marketType: "index_futures",
      content: "Version one content",
      checklist: [],
    });
    archiveEntryRule(db, created.id);

    expect(() =>
      createEntryRuleVersion(db, {
        entryRuleId: 999,
        content: "Version two content",
        checklist: [],
      }),
    ).toThrow("Entry rule 999 was not found.");
    expect(() =>
      createEntryRuleVersion(db, {
        entryRuleId: created.id,
        content: "Version two content",
        checklist: [],
      }),
    ).toThrow("Archived entry rules cannot receive new versions.");

    db.close();
  });
});

describe("archiveEntryRule", () => {
  it("archives a rule so it no longer appears in active choices", () => {
    const db = createTestDb();
    const created = createEntryRule(db, {
      name: "Opening range pullback",
      marketType: "index_futures",
      content: "Version one content",
      checklist: [],
    });

    expect(archiveEntryRule(db, created.id)).toBe(true);
    expect(listActiveEntryRulesWithLatestVersion(db)).toEqual([]);
    expect(archiveEntryRule(db, 999)).toBe(false);

    db.close();
  });
});
