import { describe, expect, it, vi } from "vitest";
import type { DesktopApi } from "../../shared/contracts/desktopApi";
import type { TradeResearchRecord } from "../../shared/contracts/researchContracts";
import { createTradeResearchStore, isResearchDraftDirty } from "./tradeResearchWorkflow";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
function record(tradeId: number, setup: string): TradeResearchRecord {
  return { tradeId, fields: { setup }, createdAt: "2026-10-08T00:00:00Z", updatedAt: "2026-10-08T00:00:00Z" };
}
function api(overrides: Partial<DesktopApi["research"]> = {}): DesktopApi["research"] {
  return { getForTrade: vi.fn(async () => undefined), saveForTrade: vi.fn(), listSamples: vi.fn(async () => []), ...overrides };
}

describe("trade research draft lifecycle", () => {
  it("does not mark untouched initial defaults as unsaved edits", async () => {
    const store = createTradeResearchStore(undefined);
    await store.loadForTrade(1);
    expect(isResearchDraftDirty(store.getSnapshot()[1])).toBe(false);
    store.updateDraft(1, "delta", "0");
    expect(isResearchDraftDirty(store.getSnapshot()[1])).toBe(true);
    store.updateDraft(1, "delta", "");
    expect(isResearchDraftDirty(store.getSnapshot()[1])).toBe(false);
  });
  it("keeps drafts per trade across selection changes", async () => {
    const store = createTradeResearchStore(undefined);
    await store.loadForTrade(1);
    store.updateDraft(1, "setup", "Absorption");
    await store.loadForTrade(2);
    store.updateDraft(2, "setup", "Pullback");
    await store.loadForTrade(1);
    expect(store.getSnapshot()[1].draft?.setup).toBe("Absorption");
    expect(store.getSnapshot()[2].draft?.setup).toBe("Pullback");
  });
  it("a save finishing for another trade cannot overwrite its draft", async () => {
    const saving = deferred<TradeResearchRecord>();
    const store = createTradeResearchStore(api({ saveForTrade: () => saving.promise }));
    await store.loadForTrade(1);
    store.updateDraft(1, "setup", "A");
    const pending = store.saveForTrade(1);
    await store.loadForTrade(2);
    store.updateDraft(2, "setup", "B");
    saving.resolve(record(1, "A"));
    await pending;
    expect(store.getSnapshot()[1].record?.fields.setup).toBe("A");
    expect(store.getSnapshot()[2].draft?.setup).toBe("B");
  });
  it("preserves edits made while the previous draft is being saved", async () => {
    const saving = deferred<TradeResearchRecord>();
    const store = createTradeResearchStore(api({ saveForTrade: () => saving.promise }));
    await store.loadForTrade(1);
    store.updateDraft(1, "setup", "A");
    const pending = store.saveForTrade(1);
    store.updateDraft(1, "setup", "A revised");
    saving.resolve(record(1, "A"));
    await pending;
    expect(store.getSnapshot()[1].draft?.setup).toBe("A revised");
    expect(isResearchDraftDirty(store.getSnapshot()[1])).toBe(true);
  });
  it("does not recreate a removed trade when a load finishes", async () => {
    const loading = deferred<TradeResearchRecord | undefined>();
    const store = createTradeResearchStore(api({ getForTrade: () => loading.promise }));
    const pending = store.loadForTrade(1);
    store.removeForTrade(1);
    loading.resolve(record(1, "A"));
    await pending;
    expect(store.getSnapshot()[1]).toBeUndefined();
  });
  it("does not recreate a removed trade when a save finishes", async () => {
    const saving = deferred<TradeResearchRecord>();
    const store = createTradeResearchStore(api({ saveForTrade: () => saving.promise }));
    await store.loadForTrade(1);
    store.updateDraft(1, "setup", "A");
    const pending = store.saveForTrade(1);
    store.removeForTrade(1);
    saving.resolve(record(1, "A"));
    await pending;
    expect(store.getSnapshot()[1]).toBeUndefined();
  });
  it("keeps load failures on their own trade and allows retry", async () => {
    const getForTrade = vi.fn().mockRejectedValueOnce(new Error("read failed")).mockResolvedValue(record(1, "retry"));
    const store = createTradeResearchStore(api({ getForTrade }));
    await store.loadForTrade(1);
    expect(store.getSnapshot()[1].draft).toBeUndefined();
    expect(store.getSnapshot()[1].error).toBe("read failed");
    await store.loadForTrade(1, true);
    expect(store.getSnapshot()[1].draft?.setup).toBe("retry");
    expect(store.getSnapshot()[1].error).toBeNull();
  });
  it("rejects invalid draft values before calling persistence", async () => {
    const mockApi = api();
    const store = createTradeResearchStore(mockApi);
    await store.loadForTrade(1);
    store.updateDraft(1, "confidence", "6");
    await store.saveForTrade(1);
    expect(mockApi.saveForTrade).not.toHaveBeenCalled();
    expect(store.getSnapshot()[1].error).toContain("当时信心");
    expect(store.getSnapshot()[1].isSaving).toBe(false);
  });
});
