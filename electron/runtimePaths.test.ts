import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveRuntimePaths } from "./runtimePaths";

describe("resolveRuntimePaths", () => {
  it("maps the compiled Electron main module back to the renderer build", () => {
    const testAppDir = path.resolve("test-app");
    const electronDistDir = path.join(
      testAppDir,
      "dist-electron",
      "electron",
    );
    const paths = resolveRuntimePaths(
      pathToFileURL(path.join(electronDistDir, "main.js")).href,
    );

    expect(paths.electronDistDir).toBe(electronDistDir);
    expect(paths.rendererDistDir).toBe(path.join(testAppDir, "dist"));
  });
});
