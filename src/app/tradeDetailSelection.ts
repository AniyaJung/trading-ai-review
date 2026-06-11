export type SelectedTradeDetailState = {
  tradeId: number;
  detail: TradeDetail | undefined;
};

export function getSelectedTradeDetail({
  previewTradeDetail,
  selectedTrade,
  selectedTradeDetailState,
}: {
  previewTradeDetail: TradeDetail | undefined;
  selectedTrade: TradeSummary | undefined;
  selectedTradeDetailState: SelectedTradeDetailState | undefined;
}) {
  if (previewTradeDetail) {
    return previewTradeDetail;
  }

  if (!selectedTrade || !selectedTradeDetailState) {
    return undefined;
  }

  return selectedTradeDetailState.tradeId === selectedTrade.id
    ? selectedTradeDetailState.detail
    : undefined;
}

export function getTradeScopedStateValue<TState extends { tradeId: number }, TValue>({
  selectedTrade,
  state,
  readValue,
}: {
  selectedTrade: TradeSummary | undefined;
  state: TState | undefined;
  readValue: (state: TState) => TValue;
}) {
  if (!selectedTrade || !state) {
    return undefined;
  }

  return state.tradeId === selectedTrade.id ? readValue(state) : undefined;
}
