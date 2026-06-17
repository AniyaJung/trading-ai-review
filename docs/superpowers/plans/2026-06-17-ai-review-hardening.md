# AI Review Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the OpenAI review adapter into testable units, add retryable error classification, preserve provider usage metadata, and show AI usage/cost context in the review panel.

**Architecture:** Keep the existing `AIReviewAdapter` contract and `ai_review.raw_result_json` persistence path. Split prompt, schema, client, error, and response normalization code into focused service modules; keep `openAiReviewAdapter.ts` as orchestration only. Do not hard-code model pricing in this slice because provider pricing changes independently of app releases; display token usage and any provider/configured cost value already present in `rawResult`.

**Tech Stack:** Electron service modules, TypeScript, Vitest, React renderer helpers.

---

## Chunk 1: Backend Adapter Boundaries

### Task 1: Extract Prompt, Schema, Response, And Error Modules

**Files:**
- Create: `electron/services/openAiReviewPrompt.ts`
- Create: `electron/services/openAiReviewSchema.ts`
- Create: `electron/services/openAiReviewResponse.ts`
- Create: `electron/services/openAiReviewErrors.ts`
- Modify: `electron/services/openAiReviewAdapter.ts`
- Modify: `electron/services/openAiReviewAdapter.test.ts`

- [x] **Step 1: Write failing adapter boundary tests**
  - Add tests that import the new modules and assert:
    - `buildOpenAIReviewPrompt(input)` includes trade facts and attachment metadata but not image data URLs.
    - `reviewJsonSchema` still requires `summary`, `scoreTotal`, `facts`, `missingInfo`, `imageObservations`, `strengths`, `weaknesses`, `suggestions`, `tags`, `confidence`, and `ruleChecks`.
    - `normalizeOpenAIReviewResponse(payload, model, promptVersion)` extracts `output_text`, normalizes invalid rule check results to `unknown`, and preserves `usage`.
    - `classifyOpenAIReviewError(status, body)` marks 429 and 5xx as retryable.
  - Run: `npm run test -- --run electron/services/openAiReviewAdapter.test.ts`
  - Expected: FAIL because the extracted modules do not exist yet.

- [x] **Step 2: Implement extracted modules**
  - Move prompt construction to `openAiReviewPrompt.ts`.
  - Move schema constant to `openAiReviewSchema.ts`.
  - Move output extraction, JSON parsing, generated review normalization, rule check normalization, and usage preservation to `openAiReviewResponse.ts`.
  - Add `OpenAIReviewError` and `classifyOpenAIReviewError` in `openAiReviewErrors.ts`.
  - Keep behavior-compatible error messages where existing tests already assert them.

- [x] **Step 3: Rewire adapter orchestration**
  - Update `openAiReviewAdapter.ts` to import the extracted modules.
  - Keep public `createOpenAIReviewAdapter` and `FetchLike` exports stable.
  - Keep default model and prompt version behavior unchanged.
  - Run: `npm run test -- --run electron/services/openAiReviewAdapter.test.ts`
  - Expected: PASS.

## Chunk 2: Retry Policy And Fixture Eval

### Task 2: Add Retryable Client Call And Fixture Coverage

**Files:**
- Create: `electron/services/openAiReviewClient.ts`
- Create: `electron/services/openAiReviewFixture.test.ts`
- Modify: `electron/services/openAiReviewAdapter.ts`
- Modify: `electron/services/openAiReviewAdapter.test.ts`

- [x] **Step 1: Write failing retry and fixture tests**
  - Add a retry test where the first fetch returns HTTP 429 and the second fetch returns a valid response; assert two requests and a successful generated review.
  - Add a non-retry test where HTTP 400 fails once with a non-retryable `OpenAIReviewError`.
  - Add a fixture eval test that builds a representative multimodal request body and normalizes a representative Responses API payload with nested `output[].content[]`.
  - Run: `npm run test -- --run electron/services/openAiReviewAdapter.test.ts electron/services/openAiReviewFixture.test.ts`
  - Expected: FAIL because retry client and fixture helpers are not wired yet.

- [x] **Step 2: Implement client retry**
  - Add `requestOpenAIReview` that accepts `fetch`, URL, request init, `maxAttempts`, and optional `retryDelayMs`.
  - Retry only retryable OpenAI errors: HTTP 408, 429, and 5xx, plus thrown network errors.
  - Do not retry missing API key, missing fetch implementation, HTTP 400, or malformed successful payloads.
  - Default retry delay should be zero in tests and short in production to avoid UI stalls.

- [x] **Step 3: Wire adapter to client**
  - Add optional adapter settings `maxAttempts` and `retryDelayMs`.
  - Keep default behavior conservative: two attempts total.
  - Run targeted tests again.
  - Expected: PASS.

## Chunk 3: Usage And Cost Display

### Task 3: Display Review Usage Metadata

**Files:**
- Modify: `src/app/reviewPanel.ts`
- Modify: `src/app/reviewPanel.test.ts`
- Modify: `src/components/TradeReviewPanel.tsx`

- [x] **Step 1: Write failing renderer tests**
  - Add tests for `getAIReviewUsageSummary(review)`:
    - total tokens render as `123 tokens` when `rawResult.usage.total_tokens` or `rawResult.usage.totalTokens` exists.
    - cost renders as `$0.0123` when `rawResult.costUsd` or `rawResult.estimatedCostUsd` exists.
    - cost renders as `未估算` when token usage exists but no cost value exists.
  - Run: `npm run test -- --run src/app/reviewPanel.test.ts`
  - Expected: FAIL because the helper does not exist.

- [x] **Step 2: Implement usage helper and UI**
  - Add `getAIReviewUsageSummary` to `src/app/reviewPanel.ts`.
  - Import and use it in `TradeReviewPanel.tsx`.
  - Show token usage and cost in the existing `review-meta-grid`; do not add a new card.
  - Keep text compact so the review panel remains scannable.

- [x] **Step 3: Run renderer tests**
  - Run: `npm run test -- --run src/app/reviewPanel.test.ts`
  - Expected: PASS.

## Chunk 4: Verification And Commit

### Task 4: Final Checks

**Files:**
- All files changed above.
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Update architecture backlog**
  - Mark AI review hardening as partially complete.
  - Record that pricing is intentionally not hard-coded; future work can add configurable pricing or provider billing import.

- [x] **Step 2: Run verification**
  - Run: `npm run test -- --run`
  - Run: `npm run lint`
  - Run: `npm run build`
  - Run: `git diff --check`
  - Expected: all pass.

- [x] **Step 3: Commit AI hardening work**
  - Commit with message: `refactor: harden openai review adapter`
