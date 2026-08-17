import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { sampleTrades } from "../app/previewData";
import { createTradeWorkflowInitialState } from "../app/tradeWorkflow";
import { TradeFormContainer } from "./TradeFormContainer";
import { TradeListContainer } from "./TradeListContainer";

describe("trade desk containers", () => {
  it("selects the first visible trade when the workflow selection is filtered out", () => {
    const html = renderToStaticMarkup(
      <TradeListContainer
        workflow={{
          state: {
            isLoadingTrades: false,
            tradeLoadError: null,
            selectedTradeId: sampleTrades[1].id,
          },
        }}
        trades={[sampleTrades[0]]}
        activeFilterLabel="品种 ES"
        onClearFilter={vi.fn()}
        onSelectTrade={vi.fn()}
      />,
    );

    expect(html).toContain("品种 ES");
    expect(html).toContain('class="trade-row selected"');
    expect(html).toContain("ES");
  });

  it("renders the trade form from workflow state", () => {
    const initialState = createTradeWorkflowInitialState(
      "browser-preview",
      sampleTrades,
    );
    const html = renderToStaticMarkup(
      <TradeFormContainer
        workflow={{
          state: {
            tradeForm: initialState.tradeForm,
            formPreview: null,
            formErrors: initialState.formErrors,
            formMessage: initialState.formMessage,
            editingTradeId: initialState.editingTradeId,
          },
          actions: { updateTradeForm: vi.fn() },
        }}
        entryRules={[]}
        instruments={[]}
      />,
    );

    expect(html).toContain("新建交易");
    expect(html).not.toContain("新建 ES 交易");
    expect(html).toContain("新记录");
    expect(html).toContain(`value="${initialState.tradeForm.symbol}"`);
  });

  it("labels editing as a separate mode with the edited trade identity", () => {
    const initialState = createTradeWorkflowInitialState(
      "browser-preview",
      sampleTrades,
    );
    const html = renderToStaticMarkup(
      <TradeFormContainer
        workflow={{
          state: {
            tradeForm: { ...initialState.tradeForm, symbol: "MES" },
            formPreview: null,
            formErrors: [],
            formMessage: "正在编辑",
            editingTradeId: 42,
          },
          actions: { updateTradeForm: vi.fn() },
        }}
        entryRules={[]}
        instruments={[]}
      />,
    );

    expect(html).toContain("编辑交易 #42");
    expect(html).not.toContain("编辑 MES 交易 #42");
    expect(html).toContain("编辑中");
  });
});
