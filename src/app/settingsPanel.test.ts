import { describe, expect, it } from "vitest";
import {
  buildDataResetInput,
  buildAISettingsInput,
  createSettingsDraft,
  createDataResetDraft,
  getSettingsPanelState,
} from "./settingsPanel";

const summary: SettingsSummary = {
  openAi: {
    apiKeyConfigured: true,
    apiKeySource: "local",
    model: "gpt-local",
    modelSource: "local",
    promptVersion: "single-trade-local-v2",
    promptVersionSource: "local",
  },
  paths: {
    appDataDir: "/Users/demo/App",
    databasePath: "/Users/demo/App/app.sqlite",
    attachmentsDir: "/Users/demo/App/attachments",
    backupsDir: "/Users/demo/App/backups",
  },
};

describe("settingsPanel", () => {
  it("creates an editable draft without exposing the saved API key", () => {
    expect(createSettingsDraft(summary)).toEqual({
      apiKey: "",
      clearApiKey: false,
      model: "gpt-local",
      promptVersion: "single-trade-local-v2",
    });
  });

  it("disables local settings actions in browser preview", () => {
    const state = getSettingsPanelState({
      runtime: "browser-preview",
      isSaving: false,
      summary,
    });

    expect(state.canSave).toBe(false);
    expect(state.apiKeyStatusLabel).toBe("已保存在本机");
  });

  it("builds a save payload that can clear or replace the API key", () => {
    expect(
      buildAISettingsInput({
        apiKey: "  sk-new  ",
        clearApiKey: false,
        model: " gpt-new ",
        promptVersion: " prompt-v2 ",
      }),
    ).toEqual({
      apiKey: "sk-new",
      clearApiKey: false,
      model: "gpt-new",
      promptVersion: "prompt-v2",
    });

    expect(
      buildAISettingsInput({
        apiKey: "sk-ignored",
        clearApiKey: true,
        model: "gpt-new",
        promptVersion: "prompt-v2",
      }),
    ).toEqual({
      clearApiKey: true,
      model: "gpt-new",
      promptVersion: "prompt-v2",
    });
  });

  it("only enables reset when the exact DELETE confirmation is entered", () => {
    expect(createDataResetDraft()).toEqual({ confirmationText: "" });

    expect(
      getSettingsPanelState({
        runtime: "electron",
        isSaving: false,
        isResetting: false,
        summary,
        resetConfirmationText: "delete",
      }).canResetLocalData,
    ).toBe(false);

    expect(
      getSettingsPanelState({
        runtime: "electron",
        isSaving: false,
        isResetting: false,
        summary,
        resetConfirmationText: "DELETE",
      }).canResetLocalData,
    ).toBe(true);
    expect(buildDataResetInput({ confirmationText: "DELETE" })).toEqual({
      confirmationText: "DELETE",
    });
  });
});
