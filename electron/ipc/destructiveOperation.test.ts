import { describe, expect, it } from "vitest";
import {
  createCloseDatabaseOnce,
  runDestructiveOperation,
} from "./destructiveOperation";

describe("destructive operation lifecycle", () => {
  it("closes before running the operation and calls afterSuccess afterwards", async () => {
    const events: string[] = [];

    await expect(
      runDestructiveOperation(
        {
          closeDatabase: () => events.push("close"),
          afterSuccess: () => events.push("after"),
        },
        async () => {
          events.push("operation");
          return "ok";
        },
      ),
    ).resolves.toBe("ok");

    expect(events).toEqual(["close", "operation", "after"]);
  });

  it("calls the completion hook when the operation fails after close", async () => {
    const events: string[] = [];

    await expect(
      runDestructiveOperation(
        {
          closeDatabase: () => events.push("close"),
          afterSuccess: () => events.push("after"),
        },
        async () => {
          events.push("operation");
          throw new Error("restore failed");
        },
      ),
    ).rejects.toThrow("restore failed");

    expect(events).toEqual(["close", "operation", "after"]);
  });

  it("creates a close hook that only closes the active database once", () => {
    let closeCount = 0;
    const closeDatabase = createCloseDatabaseOnce({
      close: () => {
        closeCount += 1;
      },
    });

    closeDatabase();
    closeDatabase();

    expect(closeCount).toBe(1);
  });
});
