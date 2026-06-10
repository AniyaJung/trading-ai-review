export type RendererRuntime = "electron" | "browser-preview";

export function getInitialTrades<T>(
  runtime: RendererRuntime,
  sampleTrades: T[],
): T[] {
  return runtime === "electron" ? [] : sampleTrades;
}
