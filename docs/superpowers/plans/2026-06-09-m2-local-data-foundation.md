# M2 Local Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first local SQLite data layer for the desktop app.

**Architecture:** Use Electron main process ownership for local data. Renderer reads database status through a narrow preload bridge and never receives direct Node.js or SQLite access.

**Tech Stack:** Electron, Node/Electron built-in `node:sqlite`, TypeScript, Vitest.

---

### Task 1: SQLite Migration Foundation

**Files:**
- Create: `electron/data/database.ts`
- Create: `electron/data/database.test.ts`

- [x] **Step 1: Write migration tests**

Verify that initializing an empty SQLite database creates the core MVP tables, sets `pragma user_version = 1`, seeds ES/MES/NQ/MNQ exactly once, rejects `open` trades, and rejects databases newer than the app supports.

- [x] **Step 2: Implement migration and seed logic**

Use `node:sqlite` `DatabaseSync` to create:

```text
instrument
trade
trade_execution
entry_rule
entry_rule_version
trade_attachment
ai_review
trade_rule_check
tag
trade_tag_map
app_setting
```

- [x] **Step 3: Verify database tests**

Run:

```bash
npm run test -- electron/data/database.test.ts --run
```

Expected: database tests pass.

### Task 2: Electron App Data Paths

**Files:**
- Create: `electron/data/appData.ts`
- Create: `electron/data/appData.test.ts`
- Modify: `electron/main.ts`

- [x] **Step 1: Resolve app-local data paths**

Use Electron `app.getPath("userData")` as the root for:

```text
app.sqlite
attachments/
backups/
```

- [x] **Step 2: Set a stable app name**

Call `app.setName("AI Trading Review")` before resolving `userData`, so local data lives under the dedicated app directory instead of the generic Electron directory.

- [x] **Step 3: Initialize database during Electron startup**

Create the app data directories, initialize `app.sqlite`, run migrations, and then create the main window.

### Task 3: Preload Database Status Bridge

**Files:**
- Create: `electron/ipc/databaseIpc.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/App.tsx`

- [x] **Step 1: Register a narrow database status IPC handler**

Expose only:

```text
databasePath
appDataDir
instrumentCount
migrationVersion
```

- [x] **Step 2: Expose status through preload**

Use `contextBridge` to expose `window.desktopApi.database.getStatus()`.

- [x] **Step 3: Render database readiness in the UI**

Show migration version and instrument count in the local-first sidebar card when running inside Electron.

### Task 4: Verification

- [x] **Step 1: Run automated checks**

Run:

```bash
npm run test -- --run
npm run build
npm run lint
npm audit --cache .npm-cache
```

Expected: tests, build, lint, and audit pass.

- [x] **Step 2: Verify runtime database creation**

Run the Electron dev app and confirm:

```text
~/Library/Application Support/AI Trading Review/app.sqlite
~/Library/Application Support/AI Trading Review/attachments/
~/Library/Application Support/AI Trading Review/backups/
```

Expected: SQLite `user_version` is 1 and instrument symbols are ES, MES, NQ, MNQ.
