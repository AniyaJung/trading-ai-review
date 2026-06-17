# Packaging Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish and verify the first repeatable local packaging path for the Electron desktop app.

**Architecture:** Add the smallest packaging setup that can produce an unsigned local macOS app directory from the existing `dist` and `dist-electron` outputs. Verify packaged startup and core local runtime assumptions before treating the app as release-ready.

**Tech Stack:** Electron, Vite, TypeScript, package-lock npm workflow, macOS local packaging, Vitest.

---

## Chunk 1: Package Tool Decision

### Task 1: Select The Packaging Tool

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Inspect current packaging baseline**
  - Run: `git status --short --branch`
  - Run: `npm run build`
  - Run: `find dist dist-electron -maxdepth 3 -type f | sort | sed -n '1,120p'`
  - Expected: build succeeds; `dist/index.html` and `dist-electron/electron/main.js` exist.

- [x] **Step 2: Choose a packaging tool**
  - Prefer `electron-builder` if it can produce `--dir` output reliably with `npmRebuild=false` and unsigned macOS directory targets.
  - Use `electron-packager` only if `electron-builder --dir` remains blocked after diagnosis.
  - Record the decision in the architecture backlog.

- [x] **Step 3: Add minimal package scripts and ignore rules**
  - Add `pack:dir` script that builds and packages a local unsigned directory app.
  - Add the packaging output directory to `.gitignore`.
  - Keep distributable installer generation out of scope.

## Chunk 2: Packaged Runtime Verification

### Task 2: Verify Packaged App Can Start

**Files:**
- Modify: package metadata/config files from Task 1 only if needed.
- Optionally create: `docs/superpowers/packaging-verification.md`

- [x] **Step 1: Run local directory packaging**
  - Run the new package script.
  - Expected: command exits 0 and creates a macOS `.app` directory under ignored output.

- [x] **Step 2: Verify packaged layout**
  - Check the `.app` contains Electron main code, preload code, renderer `index.html`, and renderer assets.
  - Expected: `Contents/Resources/app.asar` or equivalent unpacked app content includes `dist` and `dist-electron`.

- [x] **Step 3: Launch packaged app with isolated user data**
  - Use a temporary user data directory or a safe app name/path strategy.
  - Expected: app launches without crashing, initializes SQLite, and creates attachments/backups directories.
  - Safety: do not delete or reset the real `~/Library/Application Support/AI Trading Review` data.

- [x] **Step 4: Smoke check core local capabilities**
  - Verify the packaged renderer loads.
  - Verify preload/database status works.
  - Verify `node:sqlite` initialization works.
  - Verify backup path creation is not obviously broken.
  - Verify `safeStorage` can report encryption availability or save AI key metadata without exposing plaintext.
  - Note: native file picker, attachment preview, backup restore UI, and AI key save/relaunch/decrypt remain manual packaged UI checks.

- [x] **Step 5: Document unresolved packaging risks**
  - Record whether packaging is verified, partially verified, or blocked.
  - If blocked, document the exact failing command and root-cause hypothesis.

## Chunk 3: Verification And Commit

### Task 3: Final Checks

**Files:**
- Modify: docs and package config files changed above.

- [x] **Step 1: Run verification**
  - Run: `npm run test -- --run`
  - Run: `npm run lint`
  - Run: `npm run build`
  - Expected: all pass.

- [x] **Step 2: Inspect diff**
  - Run: `git diff --check`
  - Run: `git status --short`
  - Run: `git diff --stat`
  - Expected: only packaging config/docs and necessary lockfile changes are present.

- [x] **Step 3: Commit packaging work**
  - Commit with message: `chore: add packaging verification path`
