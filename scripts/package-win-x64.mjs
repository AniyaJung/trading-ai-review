import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productName = "AI Trading Review";
const electronVersion = readJson(
  path.join(rootDir, "node_modules", "electron", "package.json"),
).version;
const releaseDir = path.join(rootDir, "release");
const appOutDir = path.join(releaseDir, `${productName}-win32-x64-portable`);
const resourcesAppDir = path.join(appOutDir, "resources", "app");
const electronZipPath = path.join(
  rootDir,
  ".npm-cache",
  "electron",
  `electron-v${electronVersion}-win32-x64.zip`,
);
const electronZipUrl =
  `https://github.com/electron/electron/releases/download/v${electronVersion}/` +
  `electron-v${electronVersion}-win32-x64.zip`;
const outputZipPath = `${appOutDir}.zip`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function copyRequiredPath(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required packaging input does not exist: ${source}`);
  }

  fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true });
}

function downloadElectronZip() {
  if (fs.existsSync(electronZipPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(electronZipPath), { recursive: true });
  console.log(`Downloading ${electronZipUrl}`);
  const temporaryZipPath = `${electronZipPath}.tmp`;
  fs.rmSync(temporaryZipPath, { force: true });
  execFileSync(
    "curl",
    ["--fail", "--location", "--progress-bar", "--output", temporaryZipPath, electronZipUrl],
    {
      stdio: "inherit",
    },
  );
  fs.renameSync(temporaryZipPath, electronZipPath);
}

async function extractElectronRuntime() {
  const zip = await JSZip.loadAsync(fs.readFileSync(electronZipPath));
  const entries = Object.values(zip.files);

  for (const entry of entries) {
    const destination = path.join(appOutDir, entry.name);

    if (!destination.startsWith(appOutDir + path.sep)) {
      throw new Error(`Refusing to extract zip entry outside output directory: ${entry.name}`);
    }

    if (entry.dir) {
      fs.mkdirSync(destination, { recursive: true });
      continue;
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, await entry.async("nodebuffer"));
  }
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

function addDirectoryToZip(zip, sourceDir, zipDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const zipPath = `${zipDir}/${entry.name}`;

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, sourcePath, zipPath);
      continue;
    }

    if (entry.isFile()) {
      zip.file(zipPath, fs.readFileSync(sourcePath));
    }
  }
}

async function zipPortableDirectory() {
  fs.rmSync(outputZipPath, { force: true });
  const zip = new JSZip();
  addDirectoryToZip(zip, appOutDir, path.basename(appOutDir));
  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(outputZipPath, content);
}

downloadElectronZip();

fs.rmSync(appOutDir, { recursive: true, force: true });
fs.mkdirSync(resourcesAppDir, { recursive: true });

await extractElectronRuntime();
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

const executablePath = path.join(appOutDir, "electron.exe");
const productExecutablePath = path.join(appOutDir, `${productName}.exe`);
if (fs.existsSync(executablePath)) {
  fs.renameSync(executablePath, productExecutablePath);
}

installProductionDependencies();
await zipPortableDirectory();

console.log(`Packaged Windows portable directory: ${appOutDir}`);
console.log(`Packaged Windows portable zip: ${outputZipPath}`);
