import { safeStorage } from "electron";
import type { SecretCodec } from "./settingsService.js";

export function createSafeStorageSecretCodec(): SecretCodec | undefined {
  if (!safeStorage.isEncryptionAvailable()) {
    return undefined;
  }

  return {
    encrypt: (value) => safeStorage.encryptString(value).toString("base64"),
    decrypt: (value) =>
      safeStorage.decryptString(Buffer.from(value, "base64")),
  };
}
