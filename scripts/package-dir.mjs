import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productName = "AI Trading Review";
const platformArch = `${process.platform}-${process.arch}`;
const releaseDir = path.join(rootDir, "release");
const appOutDir = path.join(releaseDir, `${productName}-${platformArch}`);
const appBundleDir = path.join(appOutDir, `${productName}.app`);
const electronAppDir = path.join(
  rootDir,
  "node_modules",
  "electron",
  "dist",
  "Electron.app",
);
const resourcesAppDir = path.join(
  appBundleDir,
  "Contents",
  "Resources",
  "app",
);

if (process.platform !== "darwin") {
  throw new Error("pack:dir currently supports macOS .app directory packaging only.");
}

function copyRequiredPath(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required packaging input does not exist: ${source}`);
  }

  fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true });
}

function installProductionDependencies() {
  execFileSync(
    "npm",
    [
      "install",
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      path.join(rootDir, ".npm-cache"),
    ],
    {
      cwd: resourcesAppDir,
      stdio: "inherit",
    },
  );
}

fs.rmSync(appOutDir, { recursive: true, force: true });
fs.mkdirSync(resourcesAppDir, { recursive: true });

copyRequiredPath(electronAppDir, appBundleDir);

copyRequiredPath(path.join(rootDir, "dist"), path.join(resourcesAppDir, "dist"));
copyRequiredPath(
  path.join(rootDir, "dist-electron"),
  path.join(resourcesAppDir, "dist-electron"),
);
copyRequiredPath(
  path.join(rootDir, "package.json"),
  path.join(resourcesAppDir, "package.json"),
);
copyRequiredPath(
  path.join(rootDir, "package-lock.json"),
  path.join(resourcesAppDir, "package-lock.json"),
);

installProductionDependencies();

console.log(`Packaged app directory: ${appBundleDir}`);
