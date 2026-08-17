import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMainWindowOptions } from "./windowOptions";

describe("buildMainWindowOptions", () => {
  it("keeps renderer isolated from Node while loading the preload bridge", () => {
    const electronDistDir = path.resolve("app", "dist-electron", "electron");
    const options = buildMainWindowOptions(electronDistDir);

    expect(options.width).toBe(1360);
    expect(options.height).toBe(860);
    expect(options.show).toBe(false);
    expect(options.autoHideMenuBar).toBe(true);
    expect(options.backgroundColor).toBe("#f3f5f7");
    expect(options.webPreferences?.contextIsolation).toBe(true);
    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.preload).toBe(
      path.join(electronDistDir, "preload.js"),
    );
  });
});
