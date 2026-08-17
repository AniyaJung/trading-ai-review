import type { DatabaseSync } from "node:sqlite";
import type {
  AssignTradeTagInput,
  CreateTagInput,
  DeleteTagResult,
  TagDefinition,
  TradeTagAssignment,
} from "../../shared/contracts/tagContracts.js";
import type { TagCategory } from "../../shared/contracts/statsContracts.js";

const tagCategories = new Set<TagCategory>([
  "setup",
  "mistake",
  "emotion",
  "market",
]);

export function listTags(db: DatabaseSync): TagDefinition[] {
  return db
    .prepare(
      `select
        tag.id,
        tag.name,
        tag.category,
        tag.created_at as createdAt,
        count(trade_tag_map.trade_id) as tradeCount,
        sum(case when trade_tag_map.source = 'ai_review' then 1 else 0 end) as aiReviewTradeCount,
        sum(case when trade_tag_map.source = 'manual' then 1 else 0 end) as manualTradeCount
       from tag
       left join trade_tag_map on trade_tag_map.tag_id = tag.id
       group by tag.id
       order by case tag.category
         when 'setup' then 1
         when 'mistake' then 2
         when 'emotion' then 3
         when 'market' then 4
         else 99
       end, tag.name collate nocase, tag.id`,
    )
    .all() as unknown as TagDefinition[];
}

export function createTag(
  db: DatabaseSync,
  input: CreateTagInput,
): TagDefinition {
  const name = normalizeTagName(input.name);
  assertTagCategory(input.category);

  const existing = db
    .prepare("select id from tag where name = ? and category = ?")
    .get(name, input.category) as { id: number } | undefined;

  if (existing) {
    throw new Error("该分类下已存在同名标签。");
  }

  const result = db
    .prepare("insert into tag (name, category) values (?, ?)")
    .run(name, input.category);
  const created = listTags(db).find(
    (tag) => tag.id === Number(result.lastInsertRowid),
  );

  if (!created) {
    throw new Error("标签创建后未能读取。");
  }

  return created;
}

export function deleteTag(
  db: DatabaseSync,
  tagId: number,
): DeleteTagResult {
  assertPositiveInteger(tagId, "标签");
  const affected = db
    .prepare(
      "select count(distinct trade_id) as count from trade_tag_map where tag_id = ?",
    )
    .get(tagId) as { count: number };
  const result = db.prepare("delete from tag where id = ?").run(tagId);

  return {
    deleted: result.changes > 0,
    affectedTradeCount: result.changes > 0 ? Number(affected.count) : 0,
  };
}

export function listTagsForTrade(
  db: DatabaseSync,
  tradeId: number,
): TradeTagAssignment[] {
  assertPositiveInteger(tradeId, "交易");

  return db
    .prepare(
      `select
        trade_tag_map.trade_id as tradeId,
        tag.id as tagId,
        tag.name,
        tag.category,
        trade_tag_map.source
       from trade_tag_map
       join tag on tag.id = trade_tag_map.tag_id
       where trade_tag_map.trade_id = ?
       order by case tag.category
         when 'setup' then 1
         when 'mistake' then 2
         when 'emotion' then 3
         when 'market' then 4
         else 99
       end, tag.name collate nocase, tag.id`,
    )
    .all(tradeId) as unknown as TradeTagAssignment[];
}

export function assignManualTag(
  db: DatabaseSync,
  input: AssignTradeTagInput,
): TradeTagAssignment {
  assertPositiveInteger(input.tradeId, "交易");
  assertPositiveInteger(input.tagId, "标签");
  assertRowExists(db, "trade", input.tradeId, "交易");
  assertRowExists(db, "tag", input.tagId, "标签");

  db.prepare(
    `insert into trade_tag_map (trade_id, tag_id, source)
     values (?, ?, 'manual')
     on conflict(trade_id, tag_id) do update set source = 'manual'`,
  ).run(input.tradeId, input.tagId);

  const assignment = listTagsForTrade(db, input.tradeId).find(
    (tag) => tag.tagId === input.tagId,
  );

  if (!assignment) {
    throw new Error("标签分配后未能读取。");
  }

  return assignment;
}

export function removeTradeTag(
  db: DatabaseSync,
  input: AssignTradeTagInput,
): boolean {
  assertPositiveInteger(input.tradeId, "交易");
  assertPositiveInteger(input.tagId, "标签");

  return (
    db
      .prepare("delete from trade_tag_map where trade_id = ? and tag_id = ?")
      .run(input.tradeId, input.tagId).changes > 0
  );
}

function normalizeTagName(value: string) {
  const name = value.trim();

  if (!name) {
    throw new Error("标签名称不能为空。");
  }

  if (name.length > 40) {
    throw new Error("标签名称不能超过 40 个字符。");
  }

  return name;
}

function assertTagCategory(category: TagCategory) {
  if (!tagCategories.has(category)) {
    throw new Error("标签分类无效。");
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label}编号无效。`);
  }
}

function assertRowExists(
  db: DatabaseSync,
  table: "trade" | "tag",
  id: number,
  label: string,
) {
  const row = db.prepare(`select id from ${table} where id = ?`).get(id);
  if (!row) {
    throw new Error(`${label}不存在。`);
  }
}
