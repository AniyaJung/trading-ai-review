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
  try {
    return await operation();
  } finally {
    lifecycle.afterSuccess?.();
  }
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
