import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { navigationItems } from "../app/views";
import { AppTopbar } from "./AppTopbar";

const tradeView = navigationItems.find((item) => item.id === "trades");
const ruleView = navigationItems.find((item) => item.id === "rules");

const commonProps = {
  editingTradeId: null,
  isSavingTrade: false,
  isLoadingRules: false,
  isSavingRule: false,
  ruleWorkspaceMode: "browse" as const,
  onSaveTrade: vi.fn(),
  onStartCreateTrade: vi.fn(),
  onCancelEdit: vi.fn(),
  onSaveRule: vi.fn(),
  onStartCreateRule: vi.fn(),
  onCancelRuleEdit: vi.fn(),
  onRefreshRules: vi.fn(),
};

describe("AppTopbar", () => {
  it("opens trade creation from the browsing state", () => {
    const html = renderToStaticMarkup(
      <AppTopbar
        activeView={tradeView}
        currentView="trades"
        isTradeFormOpen={false}
        {...commonProps}
      />,
    );

    expect(html).toContain("新建交易");
    expect(html).not.toContain("保存交易");
    expect(html).not.toContain("返回交易列表");
  });

  it("shows save and return actions while creating a trade", () => {
    const html = renderToStaticMarkup(
      <AppTopbar
        activeView={tradeView}
        currentView="trades"
        isTradeFormOpen
        {...commonProps}
      />,
    );

    expect(html).toContain("保存交易");
    expect(html).toContain("返回交易列表");
    expect(html).not.toContain(">新建交易<");
  });

  it("shows create and refresh actions while browsing rules", () => {
    const html = renderToStaticMarkup(
      <AppTopbar
        activeView={ruleView}
        currentView="rules"
        isTradeFormOpen={false}
        {...commonProps}
      />,
    );

    expect(html).toContain("新建规则");
    expect(html).toContain("刷新规则");
    expect(html).not.toContain("保存规则");
  });

  it("shows save and return actions while appending a rule version", () => {
    const html = renderToStaticMarkup(
      <AppTopbar
        activeView={ruleView}
        currentView="rules"
        isTradeFormOpen={false}
        {...commonProps}
        ruleWorkspaceMode="version"
      />,
    );

    expect(html).toContain("保存新版本");
    expect(html).toContain("返回规则库");
    expect(html).not.toContain("刷新规则");
  });
});
