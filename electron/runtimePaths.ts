import path from "node:path";
import { fileURLToPath } from "node:url";

export type RuntimePaths = {
  electronDistDir: string;
  rendererDistDir: string;
};

export function resolveRuntimePaths(mainModuleUrl: string): RuntimePaths {
  const electronDistDir = path.dirname(fileURLToPath(mainModuleUrl));

  return {
    electronDistDir,
    rendererDistDir: path.resolve(electronDistDir, "../../dist"),
  };
}
