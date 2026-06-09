import { describe, expect, it } from "vitest";
import { buildMainWindowOptions } from "./windowOptions";

describe("buildMainWindowOptions", () => {
  it("keeps renderer isolated from Node while loading the preload bridge", () => {
    const options = buildMainWindowOptions("/app/dist-electron/electron");

    expect(options.width).toBe(1360);
    expect(options.height).toBe(860);
    expect(options.webPreferences?.contextIsolation).toBe(true);
    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.preload).toBe(
      "/app/dist-electron/electron/preload.js",
    );
  });
});
