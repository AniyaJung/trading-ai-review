import { Download, FlaskConical, ListFilter, RefreshCw, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { TradeResearchSample } from "../../shared/contracts/researchContracts";
import { researchFields, researchValueLabel } from "../../shared/trading/researchFields";
import { exportResearchCsv, filterResearchSamples, getResearchFilterError, groupResearchSamples, researchFieldLabel, researchFilterFields, researchGroupOptions, type ResearchFilters, type ResearchGroupBy } from "../app/researchPanel";
import "../styles/research.css";

type Props = {
  samples: TradeResearchSample[]; isLoading: boolean; error: string | null; isPreview: boolean;
  filters: ResearchFilters; groupBy: ResearchGroupBy;
  onFiltersChange: (filters: ResearchFilters) => void; onGroupByChange: (groupBy: ResearchGroupBy) => void;
  onRefresh: () => void; onReset: () => void; onOpenTrade: (tradeId: number) => void;
};
const number = (value: number | null, suffix = "") => value == null ? "—" : `${value.toFixed(2)}${suffix}`;

function ResearchTradeLinks({ samples, onOpenTrade }: { samples: TradeResearchSample[]; onOpenTrade: (tradeId: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  return (
    <details onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>查看 {samples.length} 笔</summary>
      {isOpen ? <div className="research-trade-links">
        {samples.slice(0, visibleCount).map(({ trade }) => (
          <button className="secondary-button" type="button" key={trade.id} onClick={() => onOpenTrade(trade.id)}>
            #{trade.id} · {trade.marketSessionDate ?? trade.openedAt.slice(0, 10)} · {number(trade.rMultiple, "R")}
          </button>
        ))}
        {visibleCount < samples.length ? <button className="secondary-button" type="button" onClick={() => setVisibleCount((count) => count + 50)}>再显示 50 笔</button> : null}
      </div> : null}
    </details>
  );
}

export function ResearchView({ samples, isLoading, error, isPreview, filters, groupBy, onFiltersChange, onGroupByChange, onRefresh, onReset, onOpenTrade }: Props) {
  const selected = useMemo(() => filterResearchSamples(samples, filters), [samples, filters]);
  const groups = useMemo(() => groupResearchSamples(selected, groupBy), [selected, groupBy]);
  const recordedCount = useMemo(() => samples.filter(({ record }) => record && Object.keys(record.fields).length > 0).length, [samples]);
  const filterError = getResearchFilterError(filters);
  const updateFilter = (key: keyof ResearchFilters, value: string) => onFiltersChange({ ...filters, [key]: value });
  const primaryFields = ["setup", "marketRegime"] as const;
  const advancedFields = researchFilterFields.filter((key) => !primaryFields.some((primary) => primary === key));
  const advancedCount = advancedFields.filter((key) => filters[key] !== "").length
    + ["startDate", "endDate", "deltaMin", "deltaMax", "maxVwapDistance"].filter((key) => filters[key as keyof ResearchFilters] !== "").length;
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== "");
  const choiceFilter = (key: typeof researchFilterFields[number]) => {
    const field = researchFields.find((item) => item.id === key)!;
    const options = field.options ?? [...new Set(samples.flatMap(({ record }) => record?.fields[key] == null ? [] : [String(record.fields[key])]))].sort().map((value) => ({ value, label: researchValueLabel(key, value) }));
    return <label key={key}>{field.label}<select value={filters[key]} onChange={(event) => updateFilter(key, event.currentTarget.value)}><option value="">全部</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
  };
  const filterLabel = (key: string, value: string) => {
    const labels: Record<string, string> = { symbol: "品种", startDate: "开始", endDate: "结束", deltaMin: "Delta ≥", deltaMax: "Delta ≤", maxVwapDistance: "VWAP 距离 ≤" };
    return `${labels[key] ?? researchFieldLabel(key as Parameters<typeof researchFieldLabel>[0])}：${researchFilterFields.some((field) => field === key) ? researchValueLabel(key as Parameters<typeof researchValueLabel>[0], value) : value}`;
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([exportResearchCsv(selected)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `trade-research-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="research-view" aria-label="主观交易研究">
      <div className="research-heading">
        <div className="research-heading-copy"><FlaskConical aria-hidden="true" size={18} /><span>从交易记录发现值得复查的条件</span></div>
        <div className="toolbar">
          {isPreview ? <span className="stats-badge">当前预览会话</span> : null}
          <button className="secondary-button" type="button" disabled={isLoading} onClick={onRefresh}><RefreshCw aria-hidden="true" size={15} />{isLoading ? "正在读取" : "刷新样本"}</button>
          <button className="secondary-button" type="button" disabled={isLoading || selected.length === 0 || Boolean(error) || Boolean(filterError)} onClick={exportCsv}><Download aria-hidden="true" size={15} />导出筛选样本 CSV</button>
        </div>
      </div>
      {error ? <div className="form-status error" role="alert">研究样本读取失败：{error}</div> : null}
      <div className="research-metrics">
        <div><span>全部交易</span><strong>{isLoading ? "…" : samples.length}</strong></div>
        <div><span>已有研究记录</span><strong>{isLoading ? "…" : recordedCount}</strong></div>
        <div><span>未填写研究记录</span><strong>{isLoading ? "…" : samples.length - recordedCount}</strong></div>
        <div><span>当前筛选样本</span><strong>{isLoading ? "…" : selected.length}</strong></div>
      </div>
      <section className="panel research-filter-panel" aria-label="研究筛选">
        <div className="filter-panel-heading">
          <div><ListFilter aria-hidden="true" size={16} /><strong>筛选样本</strong></div>
          <button className="text-button" type="button" onClick={onReset} disabled={activeFilters.length === 0}><RotateCcw aria-hidden="true" size={14} />清除筛选</button>
        </div>
        <div className="research-filters research-primary-filters">
          <label>品种<select value={filters.symbol} onChange={(event) => updateFilter("symbol", event.currentTarget.value)}><option value="">全部品种</option>{[...new Set(samples.map(({ trade }) => trade.symbol))].sort().map((symbol) => <option key={symbol}>{symbol}</option>)}</select></label>
          {primaryFields.map(choiceFilter)}
          <label>分组维度<select value={groupBy} onChange={(event) => onGroupByChange(event.currentTarget.value as ResearchGroupBy)}>{researchGroupOptions.map((key) => <option value={key} key={key}>{researchFieldLabel(key)}</option>)}</select></label>
        </div>
        <details className="research-advanced" open={filterError ? true : undefined}>
          <summary>高级筛选<span>{advancedCount ? `${advancedCount} 项已启用` : "时段、样本来源、信心与订单流"}</span></summary>
          <div className="research-filters">
            <label>开始日期（会话日）<input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.currentTarget.value)} /></label>
            <label>结束日期（会话日）<input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.currentTarget.value)} /></label>
            {advancedFields.map(choiceFilter)}
            <label>Delta 下限<input type="number" step="any" value={filters.deltaMin} onChange={(event) => updateFilter("deltaMin", event.currentTarget.value)} /></label>
            <label>Delta 上限<input type="number" step="any" value={filters.deltaMax} onChange={(event) => updateFilter("deltaMax", event.currentTarget.value)} /></label>
            <label>距 VWAP 最大绝对点数<input type="number" min={0} step="any" value={filters.maxVwapDistance} onChange={(event) => updateFilter("maxVwapDistance", event.currentTarget.value)} /></label>
            <p className="research-hint research-wide">数值条件只纳入已填写该字段的样本。筛选 Delta 数值时，需要指定相同计算口径和观察窗口。</p>
          </div>
        </details>
        {activeFilters.length > 0 ? <div className="active-filter-list" aria-label="已启用筛选">{activeFilters.map(([key, value]) => <button key={key} type="button" onClick={() => updateFilter(key as keyof ResearchFilters, "")} aria-label={`清除${filterLabel(key, value)}`}>{filterLabel(key, value)}<X aria-hidden="true" size={12} /></button>)}</div> : null}
      </section>
      {filterError ? <div className="form-status error" role="alert">{filterError}</div> : null}
      <section className="panel research-results" aria-label="条件分组统计">
        <div className="panel-heading"><h4>条件分组统计</h4><span>{groups.length} 组</span></div>
        {isLoading ? <div className="table-state">正在读取研究样本...</div> : error || filterError ? <div className="table-state">请处理上方提示后查看结果。</div> : groups.length === 0 ? <div className="table-state">暂无匹配样本。在交易详情填写并保存“交易研究记录”，或调整筛选条件。</div> : (
          <div className="research-table-scroll"><table className="research-table"><thead><tr><th>样本条件</th><th>笔数</th><th>净盈利占比</th><th>平均净 R / 覆盖</th><th>净盈亏 / 手续费</th><th>MAE 点 / 覆盖</th><th>MFE 点 / 覆盖</th><th>逐笔回看</th></tr></thead>
            <tbody>{groups.map((group) => <tr key={group.key}>
              <th scope="row">{group.label}</th><td>{group.sampleCount}</td><td>{number(group.winRate == null ? null : group.winRate * 100, "%")}</td>
              <td>{number(group.meanR, "R")}<small>{group.rCount}/{group.sampleCount} 笔</small></td>
              <td>{number(group.totalNetPnl, " USD")}<small>手续费 {number(group.totalFees, " USD")}</small></td>
              <td>{number(group.meanMae)}<small>{group.maeCount}/{group.sampleCount} 笔</small></td><td>{number(group.meanMfe)}<small>{group.mfeCount}/{group.sampleCount} 笔</small></td>
              <td><ResearchTradeLinks samples={group.samples} onOpenTrade={onOpenTrade} /></td>
            </tr>)}</tbody></table></div>
        )}
        <p className="research-hint">净盈利占比 = 净盈亏大于 0 的交易 / 该组全部交易；保本交易计入分母。平均 R、MAE、MFE 排除缺失值并显示覆盖笔数。实际成交价与手续费已反映在净盈亏中，不重复扣除滑点。</p>
      </section>
      <details className="research-methodology">
        <summary>统计口径与样本说明</summary>
        <p>来自已录入的交易事实与人工研究记录，无需先确认 AI 草稿。各组分开计算品种、实盘 / 模拟 / 回放、判断来源和研究阶段。</p>
        <p>这里展示描述性统计。只录入已做的交易会有选择偏差；样本数量、事后补录和多次筛选都影响结论，不能据此证明未来优势或回测结果。</p>
      </details>
    </section>
  );
}
