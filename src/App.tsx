import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Clock3,
  Copy,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./App.css";
import { navigationItems, type AppView } from "./app/views";
import {
  buildCreateClosedTradeInput,
  calculateTradeFormPreview,
  createInitialTradeForm,
  createTradeFormAfterSave,
  type TradeFormState,
} from "./app/tradeForm";
import { getInitialTrades } from "./app/tradeList";
import { getReviewPanelState } from "./app/reviewPanel";

const sampleTrades: TradeSummary[] = [
  {
    id: 1,
    symbol: "ES",
    instrumentName: "E-mini S&P 500",
    direction: "long",
    status: "closed",
    openedAt: "2026-06-08T14:41:00.000Z",
    closedAt: "2026-06-08T15:20:00.000Z",
    entryPriceAvg: 5300,
    exitPriceAvg: 5304.5,
    quantity: 2,
    feesTotal: 5,
    grossPnl: 450,
    netPnl: 445,
    riskAmount: 200,
    rMultiple: 2.225,
    aiReviewStatus: "needs_review",
  },
  {
    id: 2,
    symbol: "MNQ",
    instrumentName: "Micro E-mini Nasdaq-100",
    direction: "short",
    status: "closed",
    openedAt: "2026-06-07T15:18:00.000Z",
    closedAt: "2026-06-07T16:02:00.000Z",
    entryPriceAvg: 19000,
    exitPriceAvg: 18984,
    quantity: 3,
    feesTotal: 3.6,
    grossPnl: 96,
    netPnl: 92.4,
    riskAmount: 48,
    rMultiple: 1.925,
    aiReviewStatus: "confirmed",
  },
  {
    id: 3,
    symbol: "MES",
    instrumentName: "Micro E-mini S&P 500",
    direction: "long",
    status: "closed",
    openedAt: "2026-06-06T13:57:00.000Z",
    closedAt: "2026-06-06T14:22:00.000Z",
    entryPriceAvg: 5291.25,
    exitPriceAvg: 5288.25,
    quantity: 1,
    feesTotal: 1.5,
    grossPnl: -15,
    netPnl: -16.5,
    riskAmount: 12.5,
    rMultiple: -1.32,
    aiReviewStatus: "corrected",
  },
];

function App() {
  const [currentView, setCurrentView] = useState<AppView>("trades");
  const desktopRuntime = window.desktopApi?.runtime ?? "browser-preview";
  const [trades, setTrades] = useState<TradeSummary[]>(() =>
    getInitialTrades(desktopRuntime, sampleTrades),
  );
  const [tradeForm, setTradeForm] = useState<TradeFormState>(() =>
    createInitialTradeForm(),
  );
  const [formMessage, setFormMessage] = useState<string>(
    "录入已平仓交易后会立即写入本地 SQLite。",
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [isDeletingTrade, setIsDeletingTrade] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [tradeLoadError, setTradeLoadError] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [selectedTradeDetailState, setSelectedTradeDetailState] = useState<{
    tradeId: number;
    detail: TradeDetail | undefined;
  }>();
  const [loadingTradeDetailId, setLoadingTradeDetailId] = useState<number | null>(
    null,
  );
  const [tradeDetailErrorState, setTradeDetailErrorState] = useState<{
    tradeId: number;
    error: string;
  }>();
  const [databaseStatus, setDatabaseStatus] = useState<string>(
    "数据库等待桌面运行时",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDesktopState() {
      if (!window.desktopApi) {
        return;
      }

      setIsLoadingTrades(true);
      try {
        const [status, desktopTrades] = await Promise.all([
          window.desktopApi.database.getStatus(),
          window.desktopApi.trades.list(),
        ]);

        if (!cancelled) {
          setDatabaseStatus(
            `SQLite v${status.migrationVersion} / ${status.instrumentCount} 个品种`,
          );
          setTrades(desktopTrades);
          setSelectedTradeId((current) => current ?? desktopTrades[0]?.id ?? null);
          setTradeLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setTradeLoadError(
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrades(false);
        }
      }
    }

    void loadDesktopState();

    return () => {
      cancelled = true;
    };
  }, []);

  const formPreview = useMemo(() => {
    return calculateTradeFormPreview(tradeForm);
  }, [tradeForm]);

  const updateTradeForm = (field: keyof TradeFormState, value: string) => {
    setTradeForm((current) => ({ ...current, [field]: value }));
    setFormErrors([]);
  };

  const handleCreateClosedTrade = async () => {
    setFormErrors([]);
    const result = buildCreateClosedTradeInput(tradeForm);

    if (!result.ok) {
      setFormErrors(result.errors);
      setFormMessage("请修正交易事实后再保存。");
      return;
    }

    if (!window.desktopApi) {
      setFormMessage("浏览器预览不会写入数据库；Electron 运行时会保存。");
      setTrades(sampleTrades);
      return;
    }

    setIsSavingTrade(true);
    try {
      const createdTrade = await window.desktopApi.trades.createClosed(
        result.input,
      );
      setTrades(await window.desktopApi.trades.list());
      setSelectedTradeId(createdTrade.id);
      setTradeForm(createTradeFormAfterSave(tradeForm));
      setFormMessage("交易已保存，并自动生成 entry/exit 成交明细。");
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const handleDeleteSelectedTrade = async () => {
    if (!selectedTrade) {
      return;
    }

    const confirmed = window.confirm(
      `删除 ${selectedTrade.symbol} ${formatTradeTime(
        selectedTrade.openedAt,
      )} 这笔交易？成交明细和后续复盘也会一并删除。`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingTrade(true);
    try {
      if (window.desktopApi) {
        await window.desktopApi.trades.delete(selectedTrade.id);
        const nextTrades = await window.desktopApi.trades.list();
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      } else {
        const nextTrades = trades.filter((trade) => trade.id !== selectedTrade.id);
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? null);
      }
      setSelectedTradeDetailState(undefined);
      setTradeDetailErrorState(undefined);
      setFormMessage("交易已删除。");
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsDeletingTrade(false);
    }
  };

  const activeView = useMemo(
    () => navigationItems.find((item) => item.id === currentView),
    [currentView],
  );
  const selectedTrade =
    trades.find((trade) => trade.id === selectedTradeId) ?? trades[0];
  const reviewPanel = getReviewPanelState(selectedTrade);
  const previewTradeDetail =
    selectedTrade && !window.desktopApi
      ? createPreviewTradeDetail(selectedTrade)
      : undefined;
  const selectedTradeDetail =
    previewTradeDetail ??
    (selectedTradeDetailState?.tradeId === selectedTrade?.id
      ? selectedTradeDetailState.detail
      : undefined);
  const isLoadingTradeDetail = loadingTradeDetailId === selectedTrade?.id;
  const tradeDetailError =
    tradeDetailErrorState?.tradeId === selectedTrade?.id
      ? tradeDetailErrorState.error
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!selectedTrade || !window.desktopApi) {
      return;
    }

    void Promise.resolve()
      .then(() => {
        setLoadingTradeDetailId(selectedTrade.id);
        return window.desktopApi?.trades.get(selectedTrade.id);
      })
      .then((detail) => {
        if (!cancelled) {
          setSelectedTradeDetailState({ tradeId: selectedTrade.id, detail });
          setTradeDetailErrorState(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTradeDetailErrorState({
            tradeId: selectedTrade.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTradeDetailId((current) =>
            current === selectedTrade.id ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrade]);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <p className="eyebrow">Local review desk</p>
            <h1>交易复盘</h1>
          </div>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === currentView ? "nav-item active" : "nav-item"}
                title={item.description}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sync-card">
          <ShieldCheck aria-hidden="true" size={18} />
          <div>
            <strong>本地优先</strong>
            <span>
              {desktopRuntime} / {databaseStatus}
            </span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeView?.description}</p>
            <h2>{activeView?.label}</h2>
          </div>
          <div className="toolbar">
            <button type="button" className="icon-button" title="复制当前交易">
              <Copy aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateClosedTrade}
              disabled={isSavingTrade}
            >
              <Plus aria-hidden="true" size={18} />
              {isSavingTrade ? "保存中" : "保存已平仓交易"}
            </button>
          </div>
        </header>

        <section className="desk-grid">
          <section className="panel trade-list-panel" aria-label="交易列表">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Recent closed trades</p>
                <h3>交易列表</h3>
              </div>
              <span className="count-pill">{trades.length}</span>
            </div>

            <div className="trade-table">
              {isLoadingTrades ? (
                <div className="table-state">正在读取本地交易记录...</div>
              ) : tradeLoadError ? (
                <div className="table-state error">
                  读取交易失败：{tradeLoadError}
                </div>
              ) : trades.length === 0 ? (
                <div className="table-state">
                  暂无交易。保存右侧表单后，这里会显示真实记录。
                </div>
              ) : (
                trades.map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    className={
                      trade.id === selectedTrade?.id
                        ? "trade-row selected"
                        : "trade-row"
                    }
                    onClick={() => setSelectedTradeId(trade.id)}
                  >
                    <span className="trade-main">
                      <strong>{trade.symbol}</strong>
                      <small>{formatTradeTime(trade.openedAt)}</small>
                    </span>
                    <span className="direction">
                      {trade.direction === "long" ? (
                        <ArrowUpRight aria-hidden="true" size={16} />
                      ) : (
                        <ArrowDownRight aria-hidden="true" size={16} />
                      )}
                      {trade.direction}
                    </span>
                    <span>{trade.quantity}</span>
                    <span>{trade.entryPriceAvg}</span>
                    <span>{trade.exitPriceAvg}</span>
                    <span className={`status ${trade.aiReviewStatus}`}>
                      {trade.aiReviewStatus}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="panel form-panel" aria-label="交易事实">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Closed trade facts</p>
                <h3>单笔交易事实</h3>
              </div>
              <Clock3 aria-hidden="true" size={18} />
            </div>

            <div className="form-grid trade-form-grid">
              <label>
                品种
                <select
                  value={tradeForm.symbol}
                  onChange={(event) =>
                    updateTradeForm(
                      "symbol",
                      event.currentTarget.value as TradeFormState["symbol"],
                    )
                  }
                >
                  <option value="ES">ES</option>
                  <option value="MES">MES</option>
                  <option value="NQ">NQ</option>
                  <option value="MNQ">MNQ</option>
                </select>
              </label>
              <label>
                方向
                <select
                  value={tradeForm.direction}
                  onChange={(event) =>
                    updateTradeForm(
                      "direction",
                      event.currentTarget.value as TradeDirection,
                    )
                  }
                >
                  <option value="long">long</option>
                  <option value="short">short</option>
                </select>
              </label>
              <label>
                开仓时间
                <input
                  type="datetime-local"
                  value={tradeForm.openedAt}
                  onChange={(event) =>
                    updateTradeForm("openedAt", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                平仓时间
                <input
                  type="datetime-local"
                  value={tradeForm.closedAt}
                  onChange={(event) =>
                    updateTradeForm("closedAt", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                入场点位
                <input
                  inputMode="decimal"
                  value={tradeForm.entryPrice}
                  onChange={(event) =>
                    updateTradeForm("entryPrice", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                出场点位
                <input
                  inputMode="decimal"
                  value={tradeForm.exitPrice}
                  onChange={(event) =>
                    updateTradeForm("exitPrice", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                止损点位
                <input
                  inputMode="decimal"
                  value={tradeForm.stopLossPrice}
                  onChange={(event) =>
                    updateTradeForm("stopLossPrice", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                合约数
                <input
                  inputMode="decimal"
                  value={tradeForm.quantity}
                  onChange={(event) =>
                    updateTradeForm("quantity", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                止盈点位
                <input
                  inputMode="decimal"
                  value={tradeForm.takeProfitPrice}
                  onChange={(event) =>
                    updateTradeForm("takeProfitPrice", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                手续费
                <input
                  inputMode="decimal"
                  value={tradeForm.feesTotal}
                  onChange={(event) =>
                    updateTradeForm("feesTotal", event.currentTarget.value)
                  }
                />
              </label>
            </div>

            <div className="notes-grid">
              <label>
                入场理由
                <textarea
                  value={tradeForm.entryReason}
                  onChange={(event) =>
                    updateTradeForm("entryReason", event.currentTarget.value)
                  }
                />
              </label>
              <label>
                出场理由
                <textarea
                  value={tradeForm.exitReason}
                  onChange={(event) =>
                    updateTradeForm("exitReason", event.currentTarget.value)
                  }
                />
              </label>
            </div>

            <div className="metric-strip">
              <div>
                <span>净盈亏</span>
                <strong>${formPreview?.netPnl ?? "-"}</strong>
              </div>
              <div>
                <span>R 倍数</span>
                <strong>{formPreview?.rMultiple ?? "-"}R</strong>
              </div>
              <div>
                <span>计划风险</span>
                <strong>${formPreview?.riskAmount ?? "-"}</strong>
              </div>
            </div>

            <div
              className={
                formErrors.length > 0 ? "form-status error" : "form-status"
              }
            >
              {formErrors.length > 0 ? (
                <ul>
                  {formErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                formMessage
              )}
            </div>
          </section>

          <section className="panel review-panel" aria-label="AI 复盘">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AI review draft</p>
                <h3>复盘结果</h3>
              </div>
              <Sparkles aria-hidden="true" size={18} />
            </div>

            <div className="review-score">
              <span>{reviewPanel.badge}</span>
              <div>
                <strong>{reviewPanel.status}</strong>
                <p>{reviewPanel.description}</p>
              </div>
            </div>

            <ul className="review-list">
              {reviewPanel.bullets.map((bullet, index) => {
                const Icon = index === 0 ? FileText : Camera;
                return (
                  <li key={bullet}>
                    <Icon aria-hidden="true" size={17} />
                    {bullet}
                  </li>
                );
              })}
            </ul>

            <div className="detail-block">
              <div className="detail-heading">
                <strong>选中交易详情</strong>
                <span>{selectedTrade?.symbol ?? "-"}</span>
              </div>
              {isLoadingTradeDetail ? (
                <div className="detail-state">正在读取交易详情...</div>
              ) : tradeDetailError ? (
                <div className="detail-state error">
                  读取详情失败：{tradeDetailError}
                </div>
              ) : selectedTradeDetail ? (
                <>
                  <div className="detail-grid">
                    <span>止损</span>
                    <strong>{formatOptionalNumber(selectedTradeDetail.stopLossPrice)}</strong>
                    <span>止盈</span>
                    <strong>
                      {formatOptionalNumber(selectedTradeDetail.takeProfitPrice)}
                    </strong>
                    <span>净盈亏</span>
                    <strong>{formatCurrency(selectedTradeDetail.netPnl)}</strong>
                    <span>R 倍数</span>
                    <strong>{formatOptionalNumber(selectedTradeDetail.rMultiple)}R</strong>
                  </div>

                  <div className="detail-notes">
                    <p>
                      <span>入场理由</span>
                      {selectedTradeDetail.entryReason || "未填写"}
                    </p>
                    <p>
                      <span>出场理由</span>
                      {selectedTradeDetail.exitReason || "未填写"}
                    </p>
                  </div>

                  <div className="execution-list">
                    {selectedTradeDetail.executions.map((execution) => (
                      <div key={execution.id} className="execution-row">
                        <span>{execution.executionType}</span>
                        <strong>
                          {execution.side} {execution.quantity} @ {execution.price}
                        </strong>
                        <small>{formatTradeTime(execution.executedAt)}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="detail-state">暂无交易详情。</div>
              )}
            </div>

            <div className="review-actions">
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteSelectedTrade}
                disabled={!selectedTrade || isDeletingTrade}
                title="删除选中交易"
              >
                <Trash2 aria-hidden="true" size={16} />
                {isDeletingTrade ? "删除中" : "删除交易"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled
                title={
                  reviewPanel.canGenerate ? "生成接口待接入" : "当前状态不能生成"
                }
              >
                生成待接入
              </button>
              <button
                type="button"
                className="primary-button"
                disabled
                title={
                  reviewPanel.canConfirm ? "确认接口待接入" : "当前状态不能确认"
                }
              >
                确认待接入
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function createPreviewTradeDetail(trade: TradeSummary): TradeDetail {
  return {
    ...trade,
    stopLossPrice: null,
    takeProfitPrice: null,
    backgroundNote: null,
    entryReason: null,
    exitReason: null,
    emotionNote: null,
    lessonNote: null,
    executions: [
      {
        id: trade.id * 10 + 1,
        executedAt: trade.openedAt,
        side: trade.direction === "long" ? "buy" : "sell",
        price: trade.entryPriceAvg,
        quantity: trade.quantity,
        fee: 0,
        feeCurrency: "USD",
        executionType: "entry",
      },
      {
        id: trade.id * 10 + 2,
        executedAt: trade.closedAt,
        side: trade.direction === "long" ? "sell" : "buy",
        price: trade.exitPriceAvg,
        quantity: trade.quantity,
        fee: trade.feesTotal,
        feeCurrency: "USD",
        executionType: "exit",
      },
    ],
  };
}

function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return `$${value}`;
}

function formatOptionalNumber(value: number | null) {
  return value ?? "-";
}

export default App;
