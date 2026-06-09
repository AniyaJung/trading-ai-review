/// <reference types="vite/client" />

type DesktopApi = {
  runtime: "electron";
  platform: string;
};

interface Window {
  desktopApi?: DesktopApi;
}
