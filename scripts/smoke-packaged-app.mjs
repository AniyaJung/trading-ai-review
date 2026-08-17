import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productName = "AI Trading Review";
const platformArch = `${process.platform}-${process.arch}`;
const appOutDir = path.join(
  rootDir,
  "release",
  `${productName}-${platformArch}`,
);
const executablePath = resolveExecutablePath();
const userDataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "trading-ai-review-packaged-smoke-"),
);
const smokePrefix = "AI_TRADING_REVIEW_SMOKE_RESULT ";

function resolveExecutablePath() {
  if (process.platform === "darwin") {
    return path.join(
      appOutDir,
      `${productName}.app`,
      "Contents",
      "MacOS",
      "Electron",
    );
  }

  if (process.platform === "win32") {
    return path.join(appOutDir, `${productName}.exe`);
  }

  throw new Error(
    `smoke:packaged does not support ${process.platform} packaged apps.`,
  );
}

if (!fs.existsSync(executablePath)) {
  throw new Error(`Packaged executable does not exist: ${executablePath}`);
}

const child = spawn(executablePath, [], {
  env: {
    ...process.env,
    AI_TRADING_REVIEW_PACKAGED_SMOKE: "1",
    AI_TRADING_REVIEW_USER_DATA_DIR: userDataDir,
    ELECTRON_ENABLE_LOGGING: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

let stdout = "";
let stderr = "";
let timeout;

function cleanup() {
  clearTimeout(timeout);
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

timeout = setTimeout(() => {
  child.kill();
  cleanup();
  console.error("Packaged smoke test timed out.");
  process.exitCode = 1;
}, 30000);

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

child.on("error", (error) => {
  cleanup();
  console.error(`Could not launch packaged app: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  try {
    if (code !== 0) {
      throw new Error(
        `Packaged app exited with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
      );
    }

    const resultLine = stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith(smokePrefix));

    if (!resultLine) {
      throw new Error(
        `Smoke result line was not emitted.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
      );
    }

    const result = JSON.parse(resultLine.slice(smokePrefix.length));
    const expectedPaths = [
      result.databasePath,
      result.attachmentsDir,
      result.backupsDir,
      result.backupFilePath,
    ];

    if (result.appDataDir !== userDataDir) {
      throw new Error(
        `Smoke appDataDir ${result.appDataDir} did not match ${userDataDir}.`,
      );
    }

    for (const expectedPath of expectedPaths) {
      if (!fs.existsSync(expectedPath)) {
        throw new Error(`Expected packaged app path was not created: ${expectedPath}`);
      }
    }

    if (result.migrationVersion !== 4) {
      throw new Error(
        `Expected migration version 4, received ${result.migrationVersion}.`,
      );
    }

    if (
      result.rendererRootChildCount < 1 ||
      !result.rendererBodyText?.trim()
    ) {
      throw new Error(
        `Packaged renderer did not mount. Received ${JSON.stringify({
          rendererRootChildCount: result.rendererRootChildCount,
          rendererBodyText: result.rendererBodyText,
          rendererTitle: result.rendererTitle,
        })}`,
      );
    }

    console.log(
      JSON.stringify(
        {
          packagedApp: appOutDir,
          executablePath,
          appDataDir: result.appDataDir,
          migrationVersion: result.migrationVersion,
          safeStorageAvailable: result.safeStorageAvailable,
          rendererReady: true,
          rendererTitle: result.rendererTitle,
        },
        null,
        2,
      ),
    );
  } finally {
    cleanup();
  }
});
