import { useMemo, useState } from "react";
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
import { calculateClosedFuturesTrade } from "./domain/trading/futuresMath";

const trades = [
  {
    id: "T-0007",
    time: "2026-06-08 22:41",
    symbol: "ES",
    direction: "long",
    quantity: 2,
    entry: 5300,
    exit: 5304.5,
    rule: "Opening range pullback",
    status: "needs_review",
  },
  {
    id: "T-0006",
    time: "2026-06-07 23:18",
    symbol: "MNQ",
    direction: "short",
    quantity: 3,
    entry: 19000,
    exit: 18984,
    rule: "Trend continuation",
    status: "confirmed",
  },
  {
    id: "T-0005",
    time: "2026-06-06 21:57",
    symbol: "MES",
    direction: "long",
    quantity: 1,
    entry: 5291.25,
    exit: 5288.25,
    rule: "Failed breakout reclaim",
    status: "corrected",
  },
];

const currentTrade = calculateClosedFuturesTrade({
  direction: "long",
  entryPrice: 5300,
  exitPrice: 5304.5,
  stopLossPrice: 5298,
  quantity: 2,
  pointValue: 50,
  feesTotal: 5,
});

function App() {
  const [currentView, setCurrentView] = useState<AppView>("trades");

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
            <span>SQLite 与截图保存在本机</span>
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
            <button type="button" className="primary-button">
              <Plus aria-hidden="true" size={18} />
              新增已平仓交易
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
              <span className="count-pill">3</span>
            </div>

            <div className="trade-table">
              {trades.map((trade) => (
                <button key={trade.id} type="button" className="trade-row">
                  <span className="trade-main">
                    <strong>{trade.symbol}</strong>
                    <small>{trade.time}</small>
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
                  <span>{trade.entry}</span>
                  <span>{trade.exit}</span>
                  <span className={`status ${trade.status}`}>{trade.status}</span>
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

            <div className="form-grid">
              <label>
                品种
                <input value="ES" readOnly />
              </label>
              <label>
                方向
                <input value="long" readOnly />
              </label>
              <label>
                入场点位
                <input value="5300.00" readOnly />
              </label>
              <label>
                出场点位
                <input value="5304.50" readOnly />
              </label>
              <label>
                止损点位
                <input value="5298.00" readOnly />
              </label>
              <label>
                合约数
                <input value="2" readOnly />
              </label>
            </div>

            <div className="metric-strip">
              <div>
                <span>净盈亏</span>
                <strong>${currentTrade.netPnl}</strong>
              </div>
              <div>
                <span>R 倍数</span>
                <strong>{currentTrade.rMultiple}R</strong>
              </div>
              <div>
                <span>计划风险</span>
                <strong>${currentTrade.riskAmount}</strong>
              </div>
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

export default App;
