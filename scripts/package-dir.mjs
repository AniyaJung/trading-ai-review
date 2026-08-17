import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productName = "AI Trading Review";
const platformArch = `${process.platform}-${process.arch}`;
const releaseDir = path.join(rootDir, "release");
const appOutDir = path.join(releaseDir, `${productName}-${platformArch}`);

function resolvePackageLayout() {
  if (process.platform === "darwin") {
    const appBundleDir = path.join(appOutDir, `${productName}.app`);
    return {
      runtimeSource: path.join(
        rootDir,
        "node_modules",
        "electron",
        "dist",
        "Electron.app",
      ),
      runtimeDestination: appBundleDir,
      resourcesAppDir: path.join(
        appBundleDir,
        "Contents",
        "Resources",
        "app",
      ),
      executablePath: path.join(
        appBundleDir,
        "Contents",
        "MacOS",
        "Electron",
      ),
    };
  }

  if (process.platform === "win32") {
    return {
      runtimeSource: path.join(rootDir, "node_modules", "electron", "dist"),
      runtimeDestination: appOutDir,
      resourcesAppDir: path.join(appOutDir, "resources", "app"),
      executablePath: path.join(appOutDir, `${productName}.exe`),
    };
  }

  throw new Error(
    `pack:dir does not support ${process.platform} directory packaging.`,
  );
}

function copyRequiredPath(source, destination, options = {}) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required packaging input does not exist: ${source}`);
  }

  fs.cpSync(source, destination, {
    recursive: true,
    verbatimSymlinks: true,
    ...options,
  });
}

function resolveInstalledPackageDir(packageName, fromDirectory) {
  const packageParts = packageName.split("/");
  let currentDirectory = fromDirectory;

  while (true) {
    const candidate = path.join(
      currentDirectory,
      "node_modules",
      ...packageParts,
    );
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return fs.realpathSync(candidate);
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }
    currentDirectory = parentDirectory;
  }
}

function copyProductionDependencies(resourcesAppDir) {
  const appPackageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const copiedPackages = new Set();

  function copyPackage(packageName, fromDirectory, optional = false) {
    if (copiedPackages.has(packageName)) {
      return;
    }

    const sourceDirectory = resolveInstalledPackageDir(packageName, fromDirectory);
    if (!sourceDirectory) {
      if (optional) {
        return;
      }
      throw new Error(`Installed production dependency not found: ${packageName}`);
    }

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(sourceDirectory, "package.json"), "utf8"),
    );
    const destinationDirectory = path.join(
      resourcesAppDir,
      "node_modules",
      ...packageName.split("/"),
    );

    copiedPackages.add(packageName);
    fs.mkdirSync(path.dirname(destinationDirectory), { recursive: true });
    fs.cpSync(sourceDirectory, destinationDirectory, {
      recursive: true,
      dereference: true,
      filter: (source) => path.basename(source) !== "node_modules",
    });

    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      copyPackage(dependencyName, sourceDirectory);
    }
    for (const dependencyName of Object.keys(
      packageJson.optionalDependencies ?? {},
    )) {
      copyPackage(dependencyName, sourceDirectory, true);
    }
  }

  for (const dependencyName of Object.keys(appPackageJson.dependencies ?? {})) {
    copyPackage(dependencyName, rootDir);
  }
}

const layout = resolvePackageLayout();

fs.rmSync(appOutDir, { recursive: true, force: true });
fs.mkdirSync(appOutDir, { recursive: true });
copyRequiredPath(layout.runtimeSource, layout.runtimeDestination);

if (process.platform === "win32") {
  const electronExecutable = path.join(appOutDir, "electron.exe");
  if (!fs.existsSync(electronExecutable)) {
    throw new Error(`Electron executable does not exist: ${electronExecutable}`);
  }
  fs.renameSync(electronExecutable, layout.executablePath);
}

fs.mkdirSync(layout.resourcesAppDir, { recursive: true });
copyRequiredPath(
  path.join(rootDir, "dist"),
  path.join(layout.resourcesAppDir, "dist"),
);
copyRequiredPath(
  path.join(rootDir, "dist-electron"),
  path.join(layout.resourcesAppDir, "dist-electron"),
);
copyRequiredPath(
  path.join(rootDir, "package.json"),
  path.join(layout.resourcesAppDir, "package.json"),
);
copyProductionDependencies(layout.resourcesAppDir);

if (!fs.existsSync(layout.executablePath)) {
  throw new Error(`Packaged executable does not exist: ${layout.executablePath}`);
}

console.log(`Packaged app directory: ${appOutDir}`);
console.log(`Packaged executable: ${layout.executablePath}`);
