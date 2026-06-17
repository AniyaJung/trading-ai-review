export type InstrumentConfig = {
  symbol: string;
  name: string;
  assetClass: "futures";
  exchange: string;
  currency: string;
  tickSize: number;
  tickValue: number;
  pointValue: number;
};

export type DatabaseStatus = {
  databasePath: string;
  appDataDir: string;
  instrumentCount: number;
  migrationVersion: number;
};
