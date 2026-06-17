import type { DatabaseSync } from "node:sqlite";

export type DestructiveOperationLifecycle = {
  closeDatabase?: () => void;
  afterSuccess?: () => void;
};

export async function runDestructiveOperation<T>(
  lifecycle: DestructiveOperationLifecycle,
  operation: () => Promise<T>,
): Promise<T> {
  lifecycle.closeDatabase?.();
  const result = await operation();
  lifecycle.afterSuccess?.();
  return result;
}

export function createCloseDatabaseOnce(db: Pick<DatabaseSync, "close">) {
  let databaseClosed = false;

  return () => {
    if (!databaseClosed) {
      db.close();
      databaseClosed = true;
    }
  };
}
