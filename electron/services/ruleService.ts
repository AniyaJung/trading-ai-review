import type { DatabaseSync } from "node:sqlite";

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

type EntryRuleRow = Omit<EntryRuleWithLatestVersion, "latestVersion">;

type EntryRuleVersionRow = Omit<EntryRuleVersion, "checklist"> & {
  checklistJson: string;
};

export function createEntryRule(
  db: DatabaseSync,
  input: CreateEntryRuleInput,
): EntryRuleWithLatestVersion {
  const name = normalizeRequiredText(input.name, "Rule name");
  const content = normalizeRequiredText(input.content, "Rule version content");
  const checklist = normalizeChecklist(input.checklist ?? []);

  db.exec("begin immediate");
  try {
    const result = db
      .prepare(
        `insert into entry_rule (
          name,
          description,
          market_type
        ) values (?, ?, ?)`,
      )
      .run(
        name,
        normalizeOptionalText(input.description),
        normalizeOptionalText(input.marketType),
      );
    const entryRuleId = Number(result.lastInsertRowid);

    db.prepare(
      `insert into entry_rule_version (
        entry_rule_id,
        version_no,
        content,
        checklist_json
      ) values (?, 1, ?, ?)`,
    ).run(entryRuleId, content, JSON.stringify(checklist));

    db.exec("commit");
    return getEntryRuleWithLatestVersion(db, entryRuleId);
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function createEntryRuleVersion(
  db: DatabaseSync,
  input: CreateEntryRuleVersionInput,
): EntryRuleVersion {
  const content = normalizeRequiredText(input.content, "Rule version content");
  const checklist = normalizeChecklist(input.checklist ?? []);
  const rule = getEntryRuleRow(db, input.entryRuleId);

  if (!rule) {
    throw new Error(`Entry rule ${input.entryRuleId} was not found.`);
  }

  if (rule.status === "archived") {
    throw new Error("Archived entry rules cannot receive new versions.");
  }

  const latestVersionNo = getLatestVersionNo(db, input.entryRuleId);
  const nextVersionNo = latestVersionNo + 1;

  const result = db
    .prepare(
      `insert into entry_rule_version (
        entry_rule_id,
        version_no,
        content,
        checklist_json
      ) values (?, ?, ?, ?)`,
    )
    .run(input.entryRuleId, nextVersionNo, content, JSON.stringify(checklist));

  db.prepare("update entry_rule set updated_at = datetime('now') where id = ?").run(
    input.entryRuleId,
  );

  return getEntryRuleVersionById(db, Number(result.lastInsertRowid));
}

export function listActiveEntryRulesWithLatestVersion(
  db: DatabaseSync,
): EntryRuleWithLatestVersion[] {
  const rows = db
    .prepare(
      `select
        id,
        name,
        description,
        market_type as marketType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      from entry_rule
      where status = 'active'
      order by updated_at desc, id desc`,
    )
    .all() as unknown as EntryRuleRow[];

  return rows.map((rule) => ({
    ...rule,
    latestVersion: getLatestEntryRuleVersion(db, rule.id),
  }));
}

export function archiveEntryRule(db: DatabaseSync, id: number): boolean {
  const result = db
    .prepare(
      `update entry_rule
       set status = 'archived',
           updated_at = datetime('now')
       where id = ?`,
    )
    .run(id);

  return result.changes > 0;
}

export function getEntryRuleVersionById(
  db: DatabaseSync,
  id: number,
): EntryRuleVersion {
  const version = db
    .prepare(
      `select
        id,
        entry_rule_id as entryRuleId,
        version_no as versionNo,
        content,
        checklist_json as checklistJson,
        created_at as createdAt
      from entry_rule_version
      where id = ?`,
    )
    .get(id) as EntryRuleVersionRow | undefined;

  if (!version) {
    throw new Error(`Entry rule version ${id} was not found.`);
  }

  return mapVersionRow(version);
}

function getEntryRuleWithLatestVersion(
  db: DatabaseSync,
  id: number,
): EntryRuleWithLatestVersion {
  const rule = getEntryRuleRow(db, id);

  if (!rule) {
    throw new Error(`Entry rule ${id} was not found.`);
  }

  return {
    ...rule,
    latestVersion: getLatestEntryRuleVersion(db, id),
  };
}

function getEntryRuleRow(
  db: DatabaseSync,
  id: number,
): EntryRuleRow | undefined {
  return db
    .prepare(
      `select
        id,
        name,
        description,
        market_type as marketType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      from entry_rule
      where id = ?`,
    )
    .get(id) as EntryRuleRow | undefined;
}

function getLatestEntryRuleVersion(
  db: DatabaseSync,
  entryRuleId: number,
): EntryRuleVersion {
  const version = db
    .prepare(
      `select
        id,
        entry_rule_id as entryRuleId,
        version_no as versionNo,
        content,
        checklist_json as checklistJson,
        created_at as createdAt
      from entry_rule_version
      where entry_rule_id = ?
      order by version_no desc
      limit 1`,
    )
    .get(entryRuleId) as EntryRuleVersionRow | undefined;

  if (!version) {
    throw new Error(`Entry rule ${entryRuleId} has no versions.`);
  }

  return mapVersionRow(version);
}

function getLatestVersionNo(db: DatabaseSync, entryRuleId: number): number {
  const row = db
    .prepare(
      "select max(version_no) as latestVersionNo from entry_rule_version where entry_rule_id = ?",
    )
    .get(entryRuleId) as { latestVersionNo: number | null };

  return row.latestVersionNo ?? 0;
}

function mapVersionRow(row: EntryRuleVersionRow): EntryRuleVersion {
  return {
    id: row.id,
    entryRuleId: row.entryRuleId,
    versionNo: row.versionNo,
    content: row.content,
    checklist: JSON.parse(row.checklistJson) as string[],
    createdAt: row.createdAt,
  };
}

function normalizeRequiredText(value: string, label: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeChecklist(checklist: string[]): string[] {
  return checklist
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
