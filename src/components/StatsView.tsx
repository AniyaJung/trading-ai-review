import {
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  ListFilter,
  Percent,
  ReceiptText,
  Scale,
} from "lucide-react";
import {
  buildStatsOverviewFilters,
  formatCurrency,
  formatPercent,
  formatRatio,
  type StatsEntryRuleOption,
  type StatsFilterState,
  type StatsOverview,
  type StatsOverviewFilters,
} from "../app/statsPanel";

type StatsViewProps = {
  overview: StatsOverview;
  isLoading: boolean;
  error: string | null;
  isPreview: boolean;
  filters: StatsFilterState;
  instruments: InstrumentConfig[];
  entryRuleOptions: StatsEntryRuleOption[];
  onFiltersChange: (filters: StatsFilterState) => void;
  onDrillDown: (filters: StatsOverviewFilters) => void;
  onRefresh: () => void;
};

export function StatsView({
  overview,
  isLoading,
  error,
  isPreview,
  filters,
  instruments,
  entryRuleOptions,
  onFiltersChange,
  onDrillDown,
  onRefresh,
}: StatsViewProps) {
  const metrics = [
    {
      label: "总交易数",
      value: String(overview.totalTradeCount),
      Icon: BarChart3,
    },
    {
      label: "已确认复盘",
      value: String(overview.confirmedReviewCount),
      Icon: BadgeCheck,
    },
    {
      label: "总净盈亏",
      value: formatCurrency(overview.totalNetPnl),
      Icon: CircleDollarSign,
      tone: overview.totalNetPnl >= 0 ? "positive" : "negative",
    },
    {
      label: "胜率",
      value: formatPercent(overview.winRate),
      Icon: Percent,
    },
    {
      label: "平均 R",
      value: formatRatio(overview.averageRMultiple, "R"),
      Icon: Scale,
    },
    {
      label: "Profit factor",
      value: formatRatio(overview.profitFactor),
      Icon: BarChart3,
    },
    {
      label: "总手续费",
      value: formatCurrency(overview.totalFees),
      Icon: ReceiptText,
    },
  ];
  const updateFilter = (field: keyof StatsFilterState, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };
  const drillDownToTrades = (nextFilters: StatsFilterState) => {
    onDrillDown(buildStatsOverviewFilters(nextFilters));
  };

  return (
    <section className="stats-view">
      <div className="stats-heading">
        <div>
          <p className="eyebrow">Confirmed review scope</p>
          <h3>统计面板</h3>
        </div>
        <div className="toolbar">
          {isPreview ? <span className="stats-badge">预览数据</span> : null}
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "刷新中" : "刷新统计"}
          </button>
        </div>
      </div>

      {error ? <div className="form-status error">读取统计失败：{error}</div> : null}

      <div className="panel stats-filter-bar" aria-label="统计筛选">
        <label>
          时间范围
          <select
            value={filters.dateRangePreset}
            onChange={(event) =>
              updateFilter("dateRangePreset", event.target.value)
            }
          >
            <option value="all">全部</option>
            <option value="last7">最近 7 天</option>
            <option value="last30">最近 30 天</option>
            <option value="custom">自定义</option>
          </select>
        </label>

        <label>
          品种
          <select
            value={filters.symbol}
            onChange={(event) => updateFilter("symbol", event.target.value)}
          >
            <option value="">全部品种</option>
            {instruments.map((instrument) => (
              <option key={instrument.symbol} value={instrument.symbol}>
                {instrument.symbol}
              </option>
            ))}
          </select>
        </label>

        <label>
          入场规则
          <select
            value={filters.entryRuleId}
            onChange={(event) =>
              updateFilter("entryRuleId", event.target.value)
            }
          >
            <option value="">全部规则</option>
            {entryRuleOptions.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </label>

        {filters.dateRangePreset === "custom" ? (
          <>
            <label>
              开始日期
              <input
                type="date"
                value={filters.customFrom}
                onChange={(event) =>
                  updateFilter("customFrom", event.target.value)
                }
              />
            </label>
            <label>
              结束日期
              <input
                type="date"
                value={filters.customTo}
                onChange={(event) => updateFilter("customTo", event.target.value)}
              />
            </label>
          </>
        ) : null}

        <button
          type="button"
          className="secondary-button"
          onClick={() => drillDownToTrades(filters)}
        >
          <ListFilter aria-hidden="true" size={16} />
          查看交易
        </button>
      </div>

      <div className="stats-metric-grid">
        {metrics.map(({ label, value, Icon, tone }) => (
          <div key={label} className={`stats-metric ${tone ?? ""}`}>
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="panel stats-breakdown" aria-label="按品种聚合">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Instrument breakdown</p>
            <h3>按品种聚合</h3>
          </div>
          <span className="count-pill">{overview.byInstrument.length}</span>
        </div>

        {overview.byInstrument.length === 0 ? (
          <div className="table-state">
            还没有确认或修正后的复盘。确认单笔复盘后，这里会显示统计结果。
          </div>
        ) : (
          <div className="stats-table">
            <div className="stats-table-row header">
              <span>品种</span>
              <span>交易</span>
              <span>净盈亏</span>
              <span>胜率</span>
              <span>平均 R</span>
              <span>PF</span>
              <span>手续费</span>
              <span>下钻</span>
            </div>
            {overview.byInstrument.map((instrument) => (
              <div key={instrument.symbol} className="stats-table-row">
                <span className="stats-instrument">
                  <strong>{instrument.symbol}</strong>
                  <small>{instrument.instrumentName}</small>
                </span>
                <span>{instrument.tradeCount}</span>
                <span className={instrument.netPnl >= 0 ? "positive-text" : "negative-text"}>
                  {formatCurrency(instrument.netPnl)}
                </span>
                <span>{formatPercent(instrument.winRate)}</span>
                <span>{formatRatio(instrument.averageRMultiple, "R")}</span>
                <span>{formatRatio(instrument.profitFactor)}</span>
                <span>{formatCurrency(instrument.feesTotal)}</span>
                <span>
                  <button
                    type="button"
                    className="stats-drilldown-button"
                    onClick={() =>
                      drillDownToTrades({
                        ...filters,
                        symbol: instrument.symbol,
                      })
                    }
                  >
                    查看
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
