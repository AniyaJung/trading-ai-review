import type { DatabaseSync } from "node:sqlite";

export type ReviewStatus =
  | "draft"
  | "needs_review"
  | "confirmed"
  | "corrected"
  | "invalid";

export type JsonObject = Record<string, unknown>;

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

export type RuleCheckResult = "pass" | "fail" | "unknown";

export type UpdateRuleCheckInput = {
  result: RuleCheckResult;
  evidence?: string | null;
  comment?: string | null;
};

export type UpdatedRuleCheck = {
  id: number;
  tradeId: number;
  entryRuleVersionId: number;
  checkItem: string;
  result: RuleCheckResult;
  evidence: string | null;
  comment: string | null;
  scoreDelta: number | null;
  createdAt: string;
};

type AIReviewRow = Omit<
  AIReview,
  | "facts"
  | "missingInfo"
  | "imageObservations"
  | "strengths"
  | "weaknesses"
  | "suggestions"
  | "tags"
  | "rawResult"
> & {
  factsJson: string;
  missingInfoJson: string;
  imageObservationsJson: string;
  strengthsJson: string;
  weaknessesJson: string;
  suggestionsJson: string;
  tagsJson: string;
  rawResultJson: string;
};

export function createReviewDraft(
  db: DatabaseSync,
  input: CreateReviewDraftInput,
): AIReview {
  assertTradeExists(db, input.tradeId);

  db.exec("begin immediate");
  try {
    const result = db
      .prepare(
        `insert into ai_review (
          trade_id,
          status,
          model,
          prompt_version,
          rule_version_snapshot,
          score_total,
          summary,
          facts_json,
          missing_info_json,
          image_observations_json,
          strengths_json,
          weaknesses_json,
          suggestions_json,
          tags_json,
          confidence,
          raw_result_json
        ) values (?, 'needs_review', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.tradeId,
        input.model ?? null,
        input.promptVersion ?? null,
        input.ruleVersionSnapshot ?? null,
        input.scoreTotal ?? null,
        input.summary ?? null,
        stringifyJson(input.facts ?? {}),
        stringifyJson(input.missingInfo ?? []),
        stringifyJson(input.imageObservations ?? []),
        stringifyJson(input.strengths ?? []),
        stringifyJson(input.weaknesses ?? []),
        stringifyJson(input.suggestions ?? []),
        stringifyJson(input.tags ?? []),
        input.confidence ?? null,
        stringifyJson(input.rawResult ?? {}),
      );

    createDefaultRuleChecks(db, input.tradeId);
    syncTradeReviewStatus(db, input.tradeId, "needs_review");
    db.exec("commit");
    return getReviewById(db, Number(result.lastInsertRowid));
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function getLatestReviewForTrade(
  db: DatabaseSync,
  tradeId: number,
): AIReview | undefined {
  const row = db
    .prepare(
      `select
        id,
        trade_id as tradeId,
        status,
        model,
        prompt_version as promptVersion,
        rule_version_snapshot as ruleVersionSnapshot,
        score_total as scoreTotal,
        summary,
        facts_json as factsJson,
        missing_info_json as missingInfoJson,
        image_observations_json as imageObservationsJson,
        strengths_json as strengthsJson,
        weaknesses_json as weaknessesJson,
        suggestions_json as suggestionsJson,
        tags_json as tagsJson,
        confidence,
        raw_result_json as rawResultJson,
        created_at as createdAt,
        confirmed_at as confirmedAt
      from ai_review
      where trade_id = ?
      order by id desc
      limit 1`,
    )
    .get(tradeId) as AIReviewRow | undefined;

  return row ? mapReviewRow(row) : undefined;
}

export function confirmReview(db: DatabaseSync, id: number): AIReview {
  return updateReviewStatus(db, id, "confirmed", { confirmedAt: true });
}

export function correctReview(
  db: DatabaseSync,
  id: number,
  input: CorrectReviewInput,
): AIReview {
  const existing = getReviewById(db, id);

  db.exec("begin immediate");
  try {
    db.prepare(
      `update ai_review set
        status = 'corrected',
        summary = ?,
        facts_json = ?,
        missing_info_json = ?,
        image_observations_json = ?,
        strengths_json = ?,
        weaknesses_json = ?,
        suggestions_json = ?,
        tags_json = ?,
        confidence = ?,
        raw_result_json = ?,
        confirmed_at = datetime('now')
       where id = ?`,
    ).run(
      input.summary ?? existing.summary,
      stringifyJson(input.facts ?? existing.facts),
      stringifyJson(input.missingInfo ?? existing.missingInfo),
      stringifyJson(input.imageObservations ?? existing.imageObservations),
      stringifyJson(input.strengths ?? existing.strengths),
      stringifyJson(input.weaknesses ?? existing.weaknesses),
      stringifyJson(input.suggestions ?? existing.suggestions),
      stringifyJson(input.tags ?? existing.tags),
      input.confidence ?? existing.confidence,
      stringifyJson(input.rawResult ?? existing.rawResult),
      id,
    );
    syncTradeReviewStatus(db, existing.tradeId, "corrected");
    db.exec("commit");
    return getReviewById(db, id);
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function invalidateReview(db: DatabaseSync, id: number): AIReview {
  return updateReviewStatus(db, id, "invalid", { confirmedAt: false });
}

export function updateRuleCheck(
  db: DatabaseSync,
  id: number,
  input: UpdateRuleCheckInput,
): UpdatedRuleCheck {
  assertRuleCheckResult(input.result);
  assertRuleCheckExists(db, id);

  db.prepare(
    `update trade_rule_check
     set result = ?,
         evidence = ?,
         comment = ?
     where id = ?`,
  ).run(
    input.result,
    normalizeOptionalText(input.evidence),
    normalizeOptionalText(input.comment),
    id,
  );

  return getRuleCheckById(db, id);
}

function updateReviewStatus(
  db: DatabaseSync,
  id: number,
  status: ReviewStatus,
  options: { confirmedAt: boolean },
): AIReview {
  const existing = getReviewById(db, id);

  db.exec("begin immediate");
  try {
    db.prepare(
      `update ai_review
       set status = ?,
           confirmed_at = ${options.confirmedAt ? "datetime('now')" : "null"}
       where id = ?`,
    ).run(status, id);
    syncTradeReviewStatus(db, existing.tradeId, status);
    db.exec("commit");
    return getReviewById(db, id);
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function getRuleCheckById(db: DatabaseSync, id: number): UpdatedRuleCheck {
  const row = db
    .prepare(
      `select
        id,
        trade_id as tradeId,
        entry_rule_version_id as entryRuleVersionId,
        check_item as checkItem,
        result,
        evidence,
        comment,
        score_delta as scoreDelta,
        created_at as createdAt
       from trade_rule_check
       where id = ?`,
    )
    .get(id) as UpdatedRuleCheck | undefined;

  if (!row) {
    throw new Error(`Rule check ${id} was not found.`);
  }

  return row;
}

function getReviewById(db: DatabaseSync, id: number): AIReview {
  const row = db
    .prepare(
      `select
        id,
        trade_id as tradeId,
        status,
        model,
        prompt_version as promptVersion,
        rule_version_snapshot as ruleVersionSnapshot,
        score_total as scoreTotal,
        summary,
        facts_json as factsJson,
        missing_info_json as missingInfoJson,
        image_observations_json as imageObservationsJson,
        strengths_json as strengthsJson,
        weaknesses_json as weaknessesJson,
        suggestions_json as suggestionsJson,
        tags_json as tagsJson,
        confidence,
        raw_result_json as rawResultJson,
        created_at as createdAt,
        confirmed_at as confirmedAt
      from ai_review
      where id = ?`,
    )
    .get(id) as AIReviewRow | undefined;

  if (!row) {
    throw new Error(`AI review ${id} was not found.`);
  }

  return mapReviewRow(row);
}

function assertRuleCheckExists(db: DatabaseSync, id: number) {
  getRuleCheckById(db, id);
}

function assertRuleCheckResult(result: string): asserts result is RuleCheckResult {
  if (result !== "pass" && result !== "fail" && result !== "unknown") {
    throw new Error("Rule check result must be pass, fail, or unknown.");
  }
}

function assertTradeExists(db: DatabaseSync, tradeId: number) {
  const row = db.prepare("select id from trade where id = ?").get(tradeId);

  if (!row) {
    throw new Error(`Trade ${tradeId} was not found.`);
  }
}

function createDefaultRuleChecks(db: DatabaseSync, tradeId: number) {
  const ruleVersion = db
    .prepare(
      `select
        entry_rule_version.id as entryRuleVersionId,
        entry_rule_version.checklist_json as checklistJson
      from trade
      join entry_rule_version on entry_rule_version.id = trade.entry_rule_version_id
      where trade.id = ?`,
    )
    .get(tradeId) as
    | { entryRuleVersionId: number; checklistJson: string }
    | undefined;

  if (!ruleVersion) {
    return;
  }

  const existingRow = db
    .prepare(
      `select count(*) as count
       from trade_rule_check
       where trade_id = ?
         and entry_rule_version_id = ?`,
    )
    .get(tradeId, ruleVersion.entryRuleVersionId) as { count: number };

  if (existingRow.count > 0) {
    return;
  }

  const checklist = parseJsonArray(ruleVersion.checklistJson).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const insertCheck = db.prepare(
    `insert into trade_rule_check (
      trade_id,
      entry_rule_version_id,
      check_item,
      result,
      evidence,
      comment,
      score_delta
    ) values (?, ?, ?, 'unknown', null, ?, null)`,
  );

  for (const item of checklist) {
    insertCheck.run(
      tradeId,
      ruleVersion.entryRuleVersionId,
      item,
      "等待 AI 或人工确认。",
    );
  }
}

function syncTradeReviewStatus(
  db: DatabaseSync,
  tradeId: number,
  status: ReviewStatus,
) {
  db.prepare(
    `update trade
     set ai_review_status = ?,
         updated_at = datetime('now')
     where id = ?`,
  ).run(status, tradeId);
}

function mapReviewRow(row: AIReviewRow): AIReview {
  return {
    ...row,
    facts: parseJsonObject(row.factsJson),
    missingInfo: parseJsonArray(row.missingInfoJson),
    imageObservations: parseJsonArray(row.imageObservationsJson),
    strengths: parseJsonArray(row.strengthsJson),
    weaknesses: parseJsonArray(row.weaknessesJson),
    suggestions: parseJsonArray(row.suggestionsJson),
    tags: parseJsonArray(row.tagsJson),
    rawResult: parseJsonObject(row.rawResultJson),
  };
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function parseJsonObject(value: string): JsonObject {
  const parsed = JSON.parse(value) as unknown;

  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as JsonObject)
    : {};
}

function parseJsonArray(value: string): unknown[] {
  const parsed = JSON.parse(value) as unknown;

  return Array.isArray(parsed) ? parsed : [];
}
