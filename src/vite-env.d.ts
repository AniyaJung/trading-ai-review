/// <reference types="vite/client" />

type DesktopApi = {
  runtime: "electron";
  platform: string;
  database: {
    getStatus: () => Promise<{
      databasePath: string;
      appDataDir: string;
      instrumentCount: number;
      migrationVersion: number;
    }>;
  };
};

interface Window {
  desktopApi?: DesktopApi;
}
