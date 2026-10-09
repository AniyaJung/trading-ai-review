import type { TradeResearchSample } from "../../shared/contracts/researchContracts";
import { researchFields, researchValueLabel, type ResearchFieldId } from "../../shared/trading/researchFields";

export const researchFilterFields = ["setup", "marketRegime", "volatilityRegime", "session", "executionMode", "recordTiming", "studyPhase", "confidence", "absorption", "deltaConvention", "measurementWindow", "dataSource"] as const;
export type ResearchGroupBy = "setup" | "marketRegime" | "volatilityRegime" | "session" | "confidence" | "absorption";
export const researchGroupOptions: ResearchGroupBy[] = ["setup", "marketRegime", "volatilityRegime", "session", "confidence", "absorption"];
export type ResearchFilters = Record<typeof researchFilterFields[number], string> & {
  symbol: string; startDate: string; endDate: string;
  deltaMin: string; deltaMax: string; maxVwapDistance: string;
};
export function createResearchFilters(): ResearchFilters {
  return { symbol: "", setup: "", marketRegime: "", volatilityRegime: "", session: "", executionMode: "", recordTiming: "", studyPhase: "", confidence: "", absorption: "", deltaConvention: "", measurementWindow: "", dataSource: "", startDate: "", endDate: "", deltaMin: "", deltaMax: "", maxVwapDistance: "" };
}

export function getResearchFilterError(filters: ResearchFilters) {
  if ((filters.deltaMin.trim() || filters.deltaMax.trim()) && (!filters.deltaConvention || !filters.measurementWindow)) return "筛选 Delta 数值前，请选择计算口径和观察窗口。";
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return "开始日期不能晚于结束日期。";
  for (const key of ["deltaMin", "deltaMax", "maxVwapDistance"] as const) {
    if (filters[key].trim() && !Number.isFinite(Number(filters[key]))) return "请填写有效的数值筛选条件。";
  }
  if (filters.maxVwapDistance.trim() && Number(filters.maxVwapDistance) < 0) return "VWAP 距离上限不能为负。";
  if (filters.deltaMin.trim() && filters.deltaMax.trim() && Number(filters.deltaMin) > Number(filters.deltaMax)) return "Delta 下限不能大于上限。";
  return null;
}

export function filterResearchSamples(samples: TradeResearchSample[], filters: ResearchFilters) {
  if (getResearchFilterError(filters)) return [];
  return samples.filter((sample) => {
    const fields = sample.record?.fields;
    if (!fields || Object.keys(fields).length === 0) return false;
    if (filters.symbol && filters.symbol !== sample.trade.symbol) return false;
    const date = sample.trade.marketSessionDate ?? sample.trade.openedAt.slice(0, 10);
    if ((filters.startDate && date < filters.startDate) || (filters.endDate && date > filters.endDate)) return false;
    if (researchFilterFields.some((key) => filters[key] !== "" && String(fields[key] ?? "") !== filters[key])) return false;
    if (filters.deltaMin.trim() && (fields.delta == null || fields.delta < Number(filters.deltaMin))) return false;
    if (filters.deltaMax.trim() && (fields.delta == null || fields.delta > Number(filters.deltaMax))) return false;
    if (filters.maxVwapDistance.trim() && (fields.vwapDistancePoints == null || Math.abs(fields.vwapDistancePoints) > Number(filters.maxVwapDistance))) return false;
    return true;
  });
}

export type ResearchGroup = {
  key: string; label: string; sampleCount: number; rCount: number;
  winRate: number | null; meanR: number | null; totalNetPnl: number; totalFees: number;
  meanMae: number | null; maeCount: number; meanMfe: number | null; mfeCount: number;
  samples: TradeResearchSample[];
};
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function groupResearchSamples(samples: TradeResearchSample[], groupBy: ResearchGroupBy): ResearchGroup[] {
  const buckets = new Map<string, TradeResearchSample[]>();
  for (const sample of samples) {
    const fields = sample.record?.fields;
    if (!fields) continue;
    // Keep instruments, sample provenance and study phases apart even when viewing all filters.
    const key = JSON.stringify([sample.trade.symbol, fields[groupBy] ?? null, fields.executionMode ?? null, fields.recordTiming ?? null, fields.studyPhase ?? null]);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(sample);
    else buckets.set(key, [sample]);
  }
  return [...buckets].map(([key, group]) => {
    const fields = group[0].record!.fields;
    const rs = group.map(({ trade }) => trade.rMultiple).filter((r): r is number => r != null && Number.isFinite(r));
    const maes = group.map(({ record }) => record?.fields.maePoints).filter((value): value is number => value != null && Number.isFinite(value));
    const mfes = group.map(({ record }) => record?.fields.mfePoints).filter((value): value is number => value != null && Number.isFinite(value));
    return {
      key,
      label: [group[0].trade.symbol, researchValueLabel(groupBy, fields[groupBy]), researchValueLabel("executionMode", fields.executionMode), researchValueLabel("recordTiming", fields.recordTiming), researchValueLabel("studyPhase", fields.studyPhase)].join(" · "),
      sampleCount: group.length,
      rCount: rs.length,
      winRate: group.length ? group.filter(({ trade }) => trade.netPnl > 0).length / group.length : null,
      meanR: average(rs),
      totalNetPnl: group.reduce((sum, { trade }) => sum + trade.netPnl, 0),
      totalFees: group.reduce((sum, { trade }) => sum + trade.feesTotal, 0),
      meanMae: average(maes), maeCount: maes.length,
      meanMfe: average(mfes), mfeCount: mfes.length,
      samples: group,
    };
  }).sort((a, b) => b.sampleCount - a.sampleCount || a.label.localeCompare(b.label, "zh-CN"));
}

export function exportResearchCsv(samples: TradeResearchSample[]) {
  const headers = ["trade_id", "symbol", "direction", "opened_at", "market_session_date", "closed_at", "net_pnl", "fees", "net_r", "record_created_at", "record_updated_at", ...researchFields.map((field) => field.id)];
  const quote = (value: string | number | null | undefined) => {
    let text = value == null ? "" : String(value);
    // User notes must stay text when opened in spreadsheet applications.
    if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = samples.map(({ trade, record }) => [trade.id, trade.symbol, trade.direction, trade.openedAt, trade.marketSessionDate, trade.closedAt, trade.netPnl, trade.feesTotal, trade.rMultiple, record?.createdAt, record?.updatedAt, ...researchFields.map((field) => record?.fields[field.id])]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
}

export function researchFieldLabel(id: ResearchFieldId) {
  return researchFields.find((field) => field.id === id)?.label ?? id;
}
