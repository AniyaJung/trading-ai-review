import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./AppSidebar";

describe("AppSidebar", () => {
  it("includes the tag-management destination", () => {
    const html = renderToStaticMarkup(
      <AppSidebar
        currentView="tags"
        desktopRuntime="electron"
        onViewChange={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="标签"');
    expect(html).toContain('aria-current="page"');
  });

  it("shows a useful local-data action without developer diagnostics", () => {
    const html = renderToStaticMarkup(
      <AppSidebar
        currentView="trades"
        desktopRuntime="electron"
        onViewChange={vi.fn()}
      />,
    );

    expect(html).toContain("本地数据正常");
    expect(html).toContain("备份与恢复");
    expect(html).toContain("打开备份与恢复");
    expect(html).not.toContain("SQLite");
    expect(html).not.toContain("electron /");
  });

  it("marks the local-data action active on the backup view", () => {
    const html = renderToStaticMarkup(
      <AppSidebar
        currentView="backup"
        desktopRuntime="electron"
        onViewChange={vi.fn()}
      />,
    );

    expect(html).toContain('class="local-status-card active"');
  });
});
