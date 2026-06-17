import { expect, test } from "@playwright/test";

test.describe("browser preview backup and settings workflows", () => {
  test("keeps desktop-only backup actions disabled in preview mode", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "交易复盘" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "备份" }).click();

    const backupView = page.locator(".backup-view");
    await expect(
      backupView.getByRole("heading", { name: "备份恢复", exact: true }),
    ).toBeVisible();
    await expect(backupView.getByText("预览模式")).toBeVisible();
    await expect(
      backupView.getByText("当前是浏览器预览，无法访问本机数据目录。"),
    ).toBeVisible();
    await expect(backupView.getByRole("button", { name: "立即备份" })).toBeDisabled();
    await expect(
      backupView.getByRole("button", { name: "选择备份恢复" }),
    ).toBeDisabled();
    await expect(
      backupView.getByRole("button", { name: "打开数据目录" }),
    ).toBeDisabled();
    await expect(
      backupView.getByRole("button", { name: "打开备份目录" }),
    ).toBeDisabled();
    await expect(
      backupView.getByText("请在桌面应用中查看备份历史。"),
    ).toBeVisible();
  });

  test("keeps desktop-only settings actions disabled in preview mode", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "设置" }).click();

    const settingsView = page.locator(".settings-view");
    await expect(
      settingsView.getByRole("heading", { name: "设置" }),
    ).toBeVisible();
    await expect(settingsView.getByText("预览模式")).toBeVisible();
    await expect(
      settingsView.getByText(
        "API Key 只保存在本机，不会在输入框中回显；留空保存会沿用当前 Key。",
      ),
    ).toBeVisible();
    await expect(settingsView.getByLabel("OpenAI API Key")).toBeVisible();
    await expect(settingsView.getByLabel("AI 模型")).toHaveValue("gpt-5.5");
    await expect(
      settingsView.getByRole("button", { name: "保存 AI 设置" }),
    ).toBeDisabled();

    await settingsView.getByLabel("输入 DELETE 后才能重置").fill("DELETE");

    await expect(
      settingsView.getByRole("button", { name: "重置本地数据" }),
    ).toBeDisabled();
    await expect(
      settingsView.getByRole("button", { name: "打开数据目录" }),
    ).toBeDisabled();
    await expect(
      settingsView.getByRole("button", { name: "打开备份目录" }),
    ).toBeDisabled();
  });
});
