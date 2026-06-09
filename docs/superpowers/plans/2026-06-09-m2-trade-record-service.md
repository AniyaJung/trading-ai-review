# M2 Trade Record Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first closed-trade persistence service and expose it to the renderer through the Electron preload bridge.

**Architecture:** Keep trade persistence in the Electron main process. Renderer calls a narrow `window.desktopApi.trades` API, while the main process validates the configured instrument, calculates futures PnL/R, inserts the trade, and creates entry/exit execution rows in one transaction.

**Tech Stack:** Electron IPC, Node/Electron built-in `node:sqlite`, TypeScript, Vitest.

---

### Task 1: Trade Service

**Files:**
- Create: `electron/services/tradeService.ts`
- Create: `electron/services/tradeService.test.ts`

- [x] **Step 1: Write closed-trade persistence tests**

Verify saving an ES long trade calculates:

```text
gross_pnl = 450
net_pnl = 445
risk_amount = 200
r_multiple = 2.225
```

- [x] **Step 2: Generate simple execution rows**

MVP simple form creates two rows:

```text
entry: buy/sell at entry price, fee 0
exit: sell/buy at exit price, fee = fees_total
```

- [x] **Step 3: Reject unknown instruments**

Unknown symbols should fail before inserting partial data.

- [x] **Step 4: List trades by most recent opened time**

Return joined instrument/trade summaries ordered by `opened_at desc, id desc`.

### Task 2: Trade IPC and Preload Bridge

**Files:**
- Create: `electron/ipc/tradeIpc.ts`
- Create: `electron/ipc/tradeIpc.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`

- [x] **Step 1: Register narrow IPC handlers**

Expose only:

```text
trades:list
trades:createClosed
```

- [x] **Step 2: Add preload API**

Expose:

```text
window.desktopApi.trades.list()
window.desktopApi.trades.createClosed(input)
```

### Task 3: Renderer Integration

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Load trades from desktop API**

Electron runtime loads real SQLite trades. Browser preview keeps sample data.

- [x] **Step 2: Wire the primary action to create a sample closed trade**

The first UI action uses the same desktop API that the final form will use.

### Task 4: Verification

- [x] **Step 1: Run automated checks**

Run:

```bash
npm run test -- --run
npm run build
npm run lint
```

Expected: all checks pass.

- [x] **Step 2: Verify real app database write**

Use the compiled service against:

```text
~/Library/Application Support/AI Trading Review/app.sqlite
```

Expected: a closed ES trade can be inserted and listed with calculated PnL/R values.
