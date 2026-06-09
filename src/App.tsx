import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./App.css";
import { navigationItems, type AppView } from "./app/views";
import { calculateClosedFuturesTrade } from "../shared/trading/futuresMath";

type TradeFormState = {
  symbol: "ES" | "MES" | "NQ" | "MNQ";
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  feesTotal: string;
  entryReason: string;
  exitReason: string;
};

const pointValueBySymbol: Record<TradeFormState["symbol"], number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
};

const initialTradeForm: TradeFormState = {
  symbol: "ES",
  direction: "long",
  openedAt: "2026-06-08T14:41",
  closedAt: "2026-06-08T15:20",
  entryPrice: "5300",
  exitPrice: "5304.5",
  quantity: "2",
  stopLossPrice: "5298",
  takeProfitPrice: "5306",
  feesTotal: "5",
  entryReason: "Opening range pullback",
  exitReason: "Scaled out at target area",
};

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
  const [trades, setTrades] = useState<TradeSummary[]>(sampleTrades);
  const [tradeForm, setTradeForm] = useState<TradeFormState>(initialTradeForm);
  const [formMessage, setFormMessage] = useState<string>(
    "录入已平仓交易后会立即写入本地 SQLite。",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<string>(
    "数据库等待桌面运行时",
  );
  const desktopRuntime = window.desktopApi?.runtime ?? "browser-preview";

  useEffect(() => {
    let cancelled = false;

    async function loadDesktopState() {
      if (!window.desktopApi) {
        return;
      }

      const [status, desktopTrades] = await Promise.all([
        window.desktopApi.database.getStatus(),
        window.desktopApi.trades.list(),
      ]);

      if (!cancelled) {
        setDatabaseStatus(
          `SQLite v${status.migrationVersion} / ${status.instrumentCount} 个品种`,
        );
        setTrades(desktopTrades);
      }
    }

    void loadDesktopState();

    return () => {
      cancelled = true;
    };
  }, []);

  const formPreview = useMemo(() => {
    try {
      return calculateClosedFuturesTrade({
        direction: tradeForm.direction,
        entryPrice: Number(tradeForm.entryPrice),
        exitPrice: Number(tradeForm.exitPrice),
        stopLossPrice: Number(tradeForm.stopLossPrice),
        quantity: Number(tradeForm.quantity),
        pointValue: pointValueBySymbol[tradeForm.symbol],
        feesTotal: Number(tradeForm.feesTotal),
      });
    } catch {
      return null;
    }
  }, [tradeForm]);

  const updateTradeForm = (field: keyof TradeFormState, value: string) => {
    setTradeForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateClosedTrade = async () => {
    setFormError(null);

    if (!window.desktopApi) {
      setFormMessage("浏览器预览不会写入数据库；Electron 运行时会保存。");
      setTrades(sampleTrades);
      return;
    }

    setIsSavingTrade(true);
    try {
      const input = buildCreateClosedTradeInput(tradeForm);
      await window.desktopApi.trades.createClosed(input);
      setTrades(await window.desktopApi.trades.list());
      setFormMessage("交易已保存，并自动生成 entry/exit 成交明细。");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingTrade(false);
    }
  };

  const activeView = useMemo(
    () => navigationItems.find((item) => item.id === currentView),
    [currentView],
  );

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
              {trades.map((trade) => (
                <button key={trade.id} type="button" className="trade-row">
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
              ))}
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

            <div className={formError ? "form-status error" : "form-status"}>
              {formError ?? formMessage}
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
              <span>82</span>
              <div>
                <strong>needs review</strong>
                <p>等待用户确认后进入统计</p>
              </div>
            </div>

            <ul className="review-list">
              <li>
                <CheckCircle2 aria-hidden="true" size={17} />
                规则一致性证据充分，仍需核对截图时间线。
              </li>
              <li>
                <FileText aria-hidden="true" size={17} />
                缺少出场理由，统计前需要补全。
              </li>
              <li>
                <Camera aria-hidden="true" size={17} />
                已关联 2 张交易截图，MVP 接收外部标注图。
              </li>
            </ul>

            <div className="review-actions">
              <button type="button" className="secondary-button">
                重新生成
              </button>
              <button type="button" className="primary-button">
                确认复盘
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function formatTradeTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildCreateClosedTradeInput(
  form: TradeFormState,
): CreateClosedTradeInput {
  return {
    symbol: form.symbol,
    direction: form.direction,
    openedAt: new Date(form.openedAt).toISOString(),
    closedAt: new Date(form.closedAt).toISOString(),
    entryPrice: Number(form.entryPrice),
    exitPrice: Number(form.exitPrice),
    quantity: Number(form.quantity),
    stopLossPrice: Number(form.stopLossPrice),
    takeProfitPrice:
      form.takeProfitPrice.trim() === "" ? null : Number(form.takeProfitPrice),
    feesTotal: Number(form.feesTotal),
    entryReason: form.entryReason,
    exitReason: form.exitReason,
  };
}

export default App;
