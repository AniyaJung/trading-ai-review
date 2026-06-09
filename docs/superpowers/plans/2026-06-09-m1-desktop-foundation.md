# M1 Desktop Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable foundation for the AI trading review desktop app: project scaffold, navigation shell, local-first domain models, futures PnL calculations, and initial documentation inside the repo.

**Architecture:** Use an Electron + React + TypeScript + Vite application. Keep domain logic in focused TypeScript modules that are testable without the desktop runtime, and expose local desktop capabilities through a narrow preload bridge into the Electron main process.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, CSS modules/plain CSS for the initial desktop workbench UI.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/windowOptions.ts`
- Create: `tsconfig.electron.json`

- [x] **Step 1: Scaffold the React + TypeScript frontend**

Run:

```bash
npm create vite@latest . -- --template react-ts
```

Expected: Vite creates a React TypeScript project in the repository root.

- [x] **Step 2: Add Electron project metadata**

Run:

```bash
npm install --save-dev electron concurrently wait-on cross-env
```

Expected: Electron development dependencies are added.

- [x] **Step 3: Create minimal Electron shell**

Create `electron/main.ts`, `electron/preload.ts`, and `electron/windowOptions.ts` with `contextIsolation: true`, `nodeIntegration: false`, and a narrow `desktopApi` preload bridge.

- [x] **Step 4: Verify frontend scaffold**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build succeed.

### Task 2: Futures Calculation Core

**Files:**
- Create: `shared/trading/types.ts`
- Create: `shared/trading/futuresMath.ts`
- Create: `shared/trading/futuresMath.test.ts`

- [x] **Step 1: Write failing tests for long and short futures PnL**

Test cases:

```typescript
import { describe, expect, it } from "vitest";
import { calculateClosedFuturesTrade } from "./futuresMath";

describe("calculateClosedFuturesTrade", () => {
  it("calculates ES long net PnL and R multiple", () => {
    const result = calculateClosedFuturesTrade({
      direction: "long",
      entryPrice: 5300,
      exitPrice: 5304.5,
      stopLossPrice: 5298,
      quantity: 2,
      pointValue: 50,
      feesTotal: 5,
    });

    expect(result.pointPnl).toBe(4.5);
    expect(result.grossPnl).toBe(450);
    expect(result.netPnl).toBe(445);
    expect(result.riskAmount).toBe(200);
    expect(result.rMultiple).toBe(2.225);
  });

  it("calculates MNQ short net PnL and R multiple", () => {
    const result = calculateClosedFuturesTrade({
      direction: "short",
      entryPrice: 19000,
      exitPrice: 18984,
      stopLossPrice: 19008,
      quantity: 3,
      pointValue: 2,
      feesTotal: 3.6,
    });

    expect(result.pointPnl).toBe(16);
    expect(result.grossPnl).toBe(96);
    expect(result.netPnl).toBe(92.4);
    expect(result.riskAmount).toBe(48);
    expect(result.rMultiple).toBe(1.925);
  });
});
```

Run:

```bash
npm run test -- shared/trading/futuresMath.test.ts --run
```

Expected: FAIL because the module does not exist yet.

- [x] **Step 2: Implement the calculation function**

Implement `calculateClosedFuturesTrade(input)` with:

```text
long point_pnl  = exit - entry
short point_pnl = entry - exit
gross_pnl       = point_pnl * point_value * quantity
net_pnl         = gross_pnl - fees_total
risk_amount     = abs(entry - stop_loss) * point_value * quantity
r_multiple      = net_pnl / risk_amount when risk_amount > 0
```

- [x] **Step 3: Verify tests pass**

Run:

```bash
npm run test -- shared/trading/futuresMath.test.ts --run
```

Expected: Both futures calculation tests pass.

### Task 3: Desktop Workbench Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Create: `src/app/views.ts`

- [x] **Step 1: Build simple app-state navigation**

Use:

```typescript
type AppView = "trades" | "tradeDetail" | "rules" | "stats" | "backup" | "settings";
```

Render the MVP navigation labels: `交易`, `规则`, `统计`, `备份`, `设置`.

- [x] **Step 2: Render the first trading workbench screen**

The first screen should be a real desktop workbench, not a landing page. It should include a trade list area, a closed-trade form preview, and a review/status panel.

- [x] **Step 3: Verify production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build succeed.

### Task 4: Repo Hygiene and Handoff

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-06-09-ai-trading-review-design.md`

- [x] **Step 1: Initialize git**

Run:

```bash
git init
```

Expected: repository initialized in `/Users/juyu/IdeaProjects/trading-ai-review`.

- [x] **Step 2: Add ignore rules**

Ignore `node_modules`, build output, Electron output, macOS files, and local environment files.

- [x] **Step 3: Document current development status**

`README.md` should state:

```text
M1 has started.
Frontend build and domain tests can run with npm.
Electron desktop shell runs on the Node/npm toolchain; Rust/Cargo is not required.
```

- [x] **Step 4: Verify status**

Run:

```bash
npm run build
npm run test -- --run
git status --short
```

Expected: build and tests pass; git status shows the intended new project files.
