# Packaging Verification

Date: 2026-06-17

## Status

Initial local directory packaging is verified for macOS arm64.

The project now has:

- `npm run pack:dir`: builds renderer/Electron output and creates an unsigned local `.app` directory under `release/`.
- `npm run smoke:packaged`: launches the packaged app with a temporary `userData` path, verifies SQLite/app data initialization, creates a backup zip, checks `safeStorage`, and exits.

The generated app path is:

```text
release/AI Trading Review-darwin-arm64/AI Trading Review.app
```

`release/` is ignored by git.

## Packaging Approach

The first packaging path intentionally does not create a signed installer or DMG. It copies the locally installed Electron runtime from:

```text
node_modules/electron/dist/Electron.app
```

Then it adds:

```text
Contents/Resources/app/dist
Contents/Resources/app/dist-electron
Contents/Resources/app/package.json
Contents/Resources/app/package-lock.json
Contents/Resources/app/node_modules
```

Production dependencies are installed inside the packaged app resource directory with:

```text
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

This avoids the first-run packaging blocker where third-party packagers stalled while downloading or unpacking the Electron runtime.

## Verified Automatically

Command:

```bash
npm run pack:dir && npm run smoke:packaged
```

Verified:

- Packaged app launches.
- Renderer `dist/index.html` is loadable through the packaged main process.
- Preload path resolves inside `dist-electron/electron/preload.js`.
- Temporary `userData` override works through `AI_TRADING_REVIEW_USER_DATA_DIR`.
- SQLite initializes through Electron `node:sqlite`.
- Database migration version is `2`.
- `attachments/` and `backups/` directories are created.
- Backup zip creation works in the packaged app.
- `safeStorage.isEncryptionAvailable()` is callable and returned `true` on this machine.

The smoke test never touches the real app data directory.

## Lessons From Failed Attempts

`electron-builder --dir` and `@electron/packager` both stalled while acquiring the Electron runtime, before producing `release/` output. The app build itself was not the blocker.

The first custom copy script also failed because `fs.cpSync` rewrote Electron framework symlinks into absolute links pointing back to `node_modules/electron`. That caused packaged startup errors such as:

```text
icudtl.dat not found in bundle
```

The fix was to copy Electron.app with `verbatimSymlinks: true`.

## Still Requires Manual Verification

- Native file picker behavior from the packaged UI.
- Attachment copy and preview from a real selected image.
- Backup restore through the packaged UI.
- AI key save/relaunch/decrypt flow through settings UI.
- Long-running manual session with real app data.

## Not Yet Release-Ready

This packaging path is a local verification package, not a distribution pipeline.

Before release, decide whether to:

- keep this local pack script only for smoke verification; and
- use `electron-builder`, Forge, or another release tool for signing, notarization, DMG/ZIP artifacts, and update strategy.
