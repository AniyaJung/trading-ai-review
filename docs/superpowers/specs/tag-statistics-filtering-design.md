# Tag Statistics Filtering Design

## Context

The app already stores raw AI review tags in `ai_review.tags_json` and already has normalized `tag` and `trade_tag_map` tables. Statistics currently support date, instrument, and entry-rule filters, but not tag filters.

## Decision

AI-generated tags remain in `ai_review.tags_json` as the review snapshot. When a review becomes `confirmed` or `corrected`, string tags are normalized into `tag` and linked to the trade through `trade_tag_map`. Invalid or draft reviews do not contribute normalized statistics tags.

For the first useful slice, all normalized AI tags use category `setup`. Manual tag creation and tag category editing are out of scope. This keeps the implementation small while making tag filtering and trade drilldown reliable.

## Behavior

- Creating a review draft stores `tags_json` only.
- Confirming a review syncs its string tags into `tag` / `trade_tag_map`.
- Correcting a review replaces the trade's prior normalized AI tag mappings with the corrected string tags.
- Invalidating a review clears that trade's normalized AI tag mappings.
- Tag names are trimmed, empty names are ignored, duplicate names are collapsed, and non-string tag values are ignored.
- Statistics can filter by `tagId`.
- The tag filter affects both `totalTradeCount` and confirmed/corrected performance metrics, matching existing stats filter behavior.
- Browser preview mode supports deterministic sample tag filtering without writing data.

## Interfaces

Shared contract additions:

- `TagCategory = "mistake" | "emotion" | "setup" | "market"`
- `TagSummary = { id, name, category, tradeCount }`
- `StatsOverview.byTag`
- `StatsOverviewFilters.tagId`

Renderer additions:

- `StatsFilterState.tagId`
- Stats page tag dropdown populated from `overview.byTag`
- Drilldown label includes the selected tag name when available

## Out Of Scope

- Manual tag maintenance UI.
- Tag category editing.
- AI schema changes for structured tag categories.
- Tag aggregation charts.
