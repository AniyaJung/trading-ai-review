import { dialog, ipcMain } from "electron";
import type { DatabaseSync } from "node:sqlite";
import {
  attachExistingFile,
  deleteAttachment,
  listAttachmentsByTrade,
  readAttachmentImageDataUrl,
  type AttachExistingFileInput,
} from "../services/attachmentService.js";

type ChooseAndAttachInput = Omit<AttachExistingFileInput, "sourceFilePath">;

type AttachmentIpcOptions = {
  chooseImageFile?: () => Promise<string | undefined>;
};

export function createAttachmentIpcHandlers(
  db: DatabaseSync,
  attachmentsDir: string,
  options: AttachmentIpcOptions = {},
) {
  return {
    listByTrade: (tradeId: number) => listAttachmentsByTrade(db, tradeId),
    attachExistingFile: (input: AttachExistingFileInput) =>
      attachExistingFile(db, attachmentsDir, input),
    chooseAndAttach: async (input: ChooseAndAttachInput) => {
      const sourceFilePath = await options.chooseImageFile?.();

      if (!sourceFilePath) {
        return undefined;
      }

      return attachExistingFile(db, attachmentsDir, {
        ...input,
        sourceFilePath,
      });
    },
    readImageDataUrl: (id: number) => readAttachmentImageDataUrl(db, id),
    delete: (id: number) => deleteAttachment(db, id),
  };
}

export function registerAttachmentIpc(
  db: DatabaseSync,
  attachmentsDir: string,
) {
  const handlers = createAttachmentIpcHandlers(db, attachmentsDir, {
    chooseImageFile: async () => {
      const result = await dialog.showOpenDialog({
        title: "选择交易截图",
        properties: ["openFile"],
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });

      return result.canceled ? undefined : result.filePaths[0];
    },
  });

  ipcMain.handle("attachments:listByTrade", (_event, tradeId: number) =>
    handlers.listByTrade(tradeId),
  );
  ipcMain.handle(
    "attachments:attachExistingFile",
    (_event, input: AttachExistingFileInput) =>
      handlers.attachExistingFile(input),
  );
  ipcMain.handle(
    "attachments:chooseAndAttach",
    (_event, input: ChooseAndAttachInput) => handlers.chooseAndAttach(input),
  );
  ipcMain.handle("attachments:readImageDataUrl", (_event, id: number) =>
    handlers.readImageDataUrl(id),
  );
  ipcMain.handle("attachments:delete", (_event, id: number) =>
    handlers.delete(id),
  );
}
