# Packaging Verification

Date: 2026-07-01

## Status

Local packaging now covers:

- macOS arm64 unsigned `.app` directory packaging with automated smoke verification.
- Windows x64 unsigned portable ZIP packaging for manual trial runs.

The project now has:

- `npm run pack:mac:dir`: builds renderer/Electron output and creates an unsigned local `.app` directory under `release/`.
- `npm run pack:dir`: legacy alias for the same macOS directory package.
- `npm run smoke:packaged`: launches the macOS packaged app with a temporary `userData` path, verifies SQLite/app data initialization, creates a backup zip, checks `safeStorage`, and exits.
- `npm run pack:win:x64`: builds renderer/Electron output, downloads/caches the Windows x64 Electron runtime, creates a portable app directory, and writes a ZIP under `release/`.

Generated paths:

```text
release/AI Trading Review-darwin-arm64/AI Trading Review.app
release/AI Trading Review-win32-x64-portable/
release/AI Trading Review-win32-x64-portable.zip
```

`release/` is ignored by git.

## Packaging Approach

The packaging paths intentionally do not create signed installers, DMGs, notarized apps, or auto-update artifacts.

The macOS path copies the locally installed Electron runtime from:

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

The Windows x64 path downloads and caches:

```text
.npm-cache/electron/electron-v<ELECTRON_VERSION>-win32-x64.zip
```

Then it extracts the runtime into:

```text
release/AI Trading Review-win32-x64-portable/
```

It adds the same `resources/app` payload as the macOS package, renames `electron.exe` to `AI Trading Review.exe`, installs production dependencies, and creates the final ZIP with JSZip. The cache means repeated Windows packaging for the same Electron version does not redownload the runtime.

## Verified Automatically

macOS command:

```bash
npm run pack:mac:dir && npm run smoke:packaged
```

Verified:

- Packaged app launches.
- Renderer `dist/index.html` is loadable through the packaged main process.
- Preload path resolves inside `dist-electron/electron/preload.js`.
- Temporary `userData` override works through `AI_TRADING_REVIEW_USER_DATA_DIR`.
- SQLite initializes through Electron `node:sqlite`.
- Database migration version is `3`.
- `attachments/` and `backups/` directories are created.
- Backup zip creation works in the packaged app.
- `safeStorage.isEncryptionAvailable()` is callable and returned `true` on this machine.

The smoke test never touches the real app data directory.

Windows command:

```bash
npm run pack:win:x64
unzip -t "release/AI Trading Review-win32-x64-portable.zip"
```

Verified on macOS host:

- Renderer/Electron build succeeds.
- Windows x64 Electron runtime downloads and extracts.
- Portable directory contains `AI Trading Review.exe`.
- Packaged payload contains `resources/app/dist/index.html`.
- Packaged payload contains `resources/app/dist-electron/electron/main.js`.
- Packaged payload contains `resources/app/dist-electron/electron/preload.js`.
- ZIP integrity check reports no compressed-data errors.

Not verified on macOS host:

- Actual Windows process startup.
- Windows file picker and attachment preview behavior.
- Windows `safeStorage` behavior.
- Windows backup/restore behavior against real app data.

## Windows Portable Lifecycle

The Windows ZIP is a portable package, not an installer.

Uninstalling app files means closing the app and deleting the extracted directory:

```text
AI Trading Review-win32-x64-portable/
```

That does not remove user data. Electron stores default Windows `userData` under the roaming app data profile, normally:

```text
%APPDATA%\AI Trading Review
```

That directory contains:

- `app.sqlite`
- `attachments/`
- `backups/`
- local settings and encrypted secret payloads

To remove data before uninstalling, use the app Settings reset flow or delete the `userData` directory manually after exporting a backup.

Updating the portable package means closing the app, extracting the new ZIP to a fresh directory or replacing the old extracted app directory, then launching `AI Trading Review.exe`. Existing user data is preserved because it lives outside the portable app directory. Database migrations run at startup when needed.

## Lessons From Failed Attempts

`electron-builder --dir` and `@electron/packager` both stalled while acquiring the Electron runtime, before producing `release/` output. The app build itself was not the blocker.

The first custom copy script also failed because `fs.cpSync` rewrote Electron framework symlinks into absolute links pointing back to `node_modules/electron`. That caused packaged startup errors such as:

```text
icudtl.dat not found in bundle
```

The fix was to copy Electron.app with `verbatimSymlinks: true`.

## Still Requires Manual Verification

- Native file picker behavior from packaged UI on macOS and Windows.
- Attachment copy and preview from a real selected image on macOS and Windows.
- Backup restore through packaged UI on macOS and Windows.
- AI key save/relaunch/decrypt flow through settings UI on macOS and Windows.
- Long-running manual session with real app data.

## Not Yet Release-Ready

These packaging paths are local verification/trial packages, not a distribution pipeline.

Before release, decide whether to:

- keep these local pack scripts only for smoke verification and manual trial builds; and
- use `electron-builder`, Forge, or another release tool for signing, notarization, installer/DMG/ZIP artifacts, and update strategy.
