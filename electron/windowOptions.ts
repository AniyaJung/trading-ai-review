import type { BrowserWindowConstructorOptions } from "electron";
import path from "node:path";

export function buildMainWindowOptions(
  electronDistDir: string,
): BrowserWindowConstructorOptions {
  return {
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#ece7dc",
    title: "AI 交易复盘",
    webPreferences: {
      preload: path.join(electronDistDir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}
