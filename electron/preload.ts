import { contextBridge } from "electron";

const desktopApi = {
  runtime: "electron" as const,
  platform: process.platform,
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
