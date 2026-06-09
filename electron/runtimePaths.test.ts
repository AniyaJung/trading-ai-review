import { describe, expect, it } from "vitest";
import { resolveRuntimePaths } from "./runtimePaths";

describe("resolveRuntimePaths", () => {
  it("maps the compiled Electron main module back to the renderer build", () => {
    const paths = resolveRuntimePaths(
      "file:///Users/juyu/IdeaProjects/trading-ai-review/dist-electron/electron/main.js",
    );

    expect(paths.electronDistDir).toBe(
      "/Users/juyu/IdeaProjects/trading-ai-review/dist-electron/electron",
    );
    expect(paths.rendererDistDir).toBe(
      "/Users/juyu/IdeaProjects/trading-ai-review/dist",
    );
  });
});
