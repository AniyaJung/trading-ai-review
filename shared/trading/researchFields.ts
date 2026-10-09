import type { TradeResearchFields } from "../contracts/researchContracts.js";

export type ResearchFieldId = keyof TradeResearchFields;
export type ResearchDraft = Partial<Record<ResearchFieldId, string>>;
type Choice = { value: string; label: string };
type Field = {
  id: ResearchFieldId;
  label: string;
  kind: "text" | "number" | "choice";
  options?: Choice[];
  min?: number;
  max?: number;
  integer?: boolean;
  multiline?: boolean;
  hint?: string;
};

const choices = (...entries: [string, string][]): Choice[] =>
  entries.map(([value, label]) => ({ value, label }));
const yesNo = choices(["yes", "是"], ["no", "否"]);

export const researchFieldGroups: { title: string; description: string; fields: Field[] }[] = [
  {
    title: "样本与交易判断",
    description: "记录当时的假设。判断来源和研究阶段由你标记，软件不能证明笔记是在事前写下的。",
    fields: [
      { id: "executionMode", label: "交易来源", kind: "choice", options: choices(["live", "实盘"], ["paper", "模拟"], ["replay", "历史回放"]) },
      { id: "recordTiming", label: "原始判断来源", kind: "choice", options: choices(["pre_entry", "入场前笔记（自报）"], ["during_trade", "持仓中笔记（自报）"], ["post_trade", "事后回忆 / 补录"]) },
      { id: "studyPhase", label: "研究阶段", kind: "choice", options: choices(["discovery", "探索样本"], ["validation", "验证样本"], ["forward", "前向观察"]) },
      { id: "setup", label: "Setup / 交易模式", kind: "text", hint: "例如：前高突破失败、VWAP 回踩。相同模式使用相同名称。" },
      { id: "confidence", label: "当时信心（1–5）", kind: "number", min: 1, max: 5, integer: true },
      { id: "expectedDirection", label: "当时预期方向", kind: "choice", options: choices(["up", "上涨"], ["down", "下跌"], ["range", "横盘"]) },
      { id: "horizonSeconds", label: "预期观察窗口（秒）", kind: "number", min: 1, integer: true },
      { id: "thesis", label: "交易假设 / 入场触发", kind: "text", multiline: true },
      { id: "invalidation", label: "假设失效条件", kind: "text", multiline: true },
    ],
  },
  {
    title: "市场环境",
    description: "用同一套口径标记时段、趋势和波动，便于比较不同环境下的表现。",
    fields: [
      { id: "session", label: "交易时段（人工标记）", kind: "choice", options: choices(["asia", "亚洲时段"], ["europe", "欧洲时段"], ["us_open", "美盘开盘"], ["us_midday", "美盘午间"], ["us_close", "美盘尾盘"]) },
      { id: "marketRegime", label: "市场状态", kind: "choice", options: choices(["trend", "趋势"], ["range", "震荡"], ["transition", "过渡"]) },
      { id: "volatilityRegime", label: "波动状态", kind: "choice", options: choices(["low", "低波动"], ["normal", "正常波动"], ["high", "高波动"]) },
      { id: "directionalBias", label: "方向偏见", kind: "choice", options: choices(["bullish", "偏多"], ["bearish", "偏空"], ["neutral", "中性"]) },
      { id: "vwapPosition", label: "VWAP 位置", kind: "choice", options: choices(["above", "上方"], ["below", "下方"], ["around", "附近"]) },
      { id: "vwapDistancePoints", label: "距 VWAP（点）", kind: "number", hint: "价格减 VWAP；上方为正，下方为负。" },
      { id: "atrPoints", label: "ATR（点）", kind: "number", min: 0 },
      { id: "newsContext", label: "新闻环境", kind: "choice", options: choices(["regular", "常规"], ["scheduled_event", "计划内数据 / 新闻"], ["unscheduled_event", "突发新闻"]) },
      { id: "keyLevelNote", label: "关键位置 / 开盘结构", kind: "text", multiline: true, hint: "前日 / 隔夜高低点、IB、开盘类型；注明范围和周期。" },
    ],
  },
  {
    title: "订单流与价格响应",
    description: "Bid / Ask 成交量属于已成交数据；数值必须来自同一观察窗口。吸收和衰竭是你的观察标签。",
    fields: [
      { id: "dataSource", label: "平台 / 数据来源", kind: "text" },
      { id: "measurementWindow", label: "观察窗口 / 图表口径", kind: "text", hint: "例如：入场前 30 秒、40 Range；注明 ATR 和 Profile 的周期。" },
      { id: "deltaConvention", label: "Delta 计算口径", kind: "choice", options: choices(["ask_minus_bid", "Ask − Bid"], ["bid_minus_ask", "Bid − Ask"]) },
      { id: "volume", label: "成交量（手）", kind: "number", min: 0, integer: true },
      { id: "bidVolume", label: "Bid 成交量（手）", kind: "number", min: 0, integer: true },
      { id: "askVolume", label: "Ask 成交量（手）", kind: "number", min: 0, integer: true },
      { id: "delta", label: "Delta（手）", kind: "number", integer: true },
      { id: "cumulativeDelta", label: "累计 Delta（手）", kind: "number", integer: true },
      { id: "priceResponsePoints", label: "窗口内价格变化（点）", kind: "number", hint: "窗口末价减初价；上涨为正，下跌为负。" },
      { id: "absorption", label: "吸收观察", kind: "choice", options: choices(["none", "未观察到"], ["bid", "Bid 侧"], ["ask", "Ask 侧"], ["both", "双侧"]) },
      { id: "exhaustion", label: "衰竭观察", kind: "choice", options: choices(["none", "未观察到"], ["buy", "买盘"], ["sell", "卖盘"]) },
      { id: "pocPrice", label: "POC 价格", kind: "number", min: 0 },
      { id: "vahPrice", label: "VAH 价格", kind: "number", min: 0 },
      { id: "valPrice", label: "VAL 价格", kind: "number", min: 0 },
    ],
  },
  {
    title: "DOM / 流动性事件",
    description: "记录挂单的增加、撤单或补单现象及后续价格响应；挂单数量与成交量分开填写。",
    fields: [
      { id: "liquidityEvent", label: "主要流动性事件", kind: "choice", options: choices(["replenishment", "持续补单"], ["pulling", "撤单"], ["adding", "增加挂单"], ["sweep", "扫过多个价位"], ["stable", "盘口稳定"]) },
      { id: "bidDepth", label: "Bid 挂单深度（手）", kind: "number", min: 0, integer: true },
      { id: "askDepth", label: "Ask 挂单深度（手）", kind: "number", min: 0, integer: true },
      { id: "depthLevels", label: "深度统计档数", kind: "number", min: 1, integer: true },
      { id: "spreadTicks", label: "当时价差（ticks）", kind: "number", min: 0 },
      { id: "domObservation", label: "事件位置 / 证据", kind: "text", multiline: true },
    ],
  },
  {
    title: "持仓管理与执行",
    description: "MAE / MFE 填写持仓期间相对入场价的最大不利 / 有利波动，均为非负点数。未知时留空。",
    fields: [
      { id: "maePoints", label: "MAE（点）", kind: "number", min: 0 },
      { id: "mfePoints", label: "MFE（点）", kind: "number", min: 0 },
      { id: "slippageTicks", label: "总滑点（ticks）", kind: "number", hint: "相对计划成交价，不利为正、价格改善为负。仅作诊断，不重复扣除盈亏。" },
      { id: "stopMoved", label: "是否移动止损", kind: "choice", options: yesNo },
      { id: "targetMoved", label: "是否移动止盈", kind: "choice", options: yesNo },
      { id: "partialExit", label: "是否分批退出", kind: "choice", options: yesNo },
      { id: "managementNote", label: "管理过程 / 离场反思", kind: "text", multiline: true },
    ],
  },
  {
    title: "个人状态",
    description: "用简短评分和描述记录当时的精力、压力和情绪。",
    fields: [
      { id: "energy", label: "精力（1–5）", kind: "number", min: 1, max: 5, integer: true },
      { id: "stress", label: "压力（1–5）", kind: "number", min: 1, max: 5, integer: true },
      { id: "emotionNote", label: "情绪 / 执行偏差", kind: "text", multiline: true },
    ],
  },
];

export const researchFields = researchFieldGroups.flatMap((group) => group.fields);

export function normalizeResearchFields(input: unknown): TradeResearchFields {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("研究记录必须是字段对象。");
  }
  const source = input as Record<string, unknown>;
  if (Object.keys(source).some((key) => !researchFields.some((field) => field.id === key))) {
    throw new Error("研究记录包含不支持的字段。");
  }
  const result: Record<string, string | number> = {};
  for (const field of researchFields) {
    const value = source[field.id];
    if (value == null) continue;
    if (field.kind === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) ||
        (field.integer && !Number.isSafeInteger(value)) ||
        (field.min != null && value < field.min) ||
        (field.max != null && value > field.max)) {
        throw new Error(`${field.label}：请输入有效${field.integer ? "整数" : "数值"}${field.min != null ? `，最小 ${field.min}` : ""}${field.max != null ? `，最大 ${field.max}` : ""}。`);
      }
      result[field.id] = value;
    } else {
      if (typeof value !== "string") throw new Error(`${field.label}：请输入文字。`);
      const text = value.trim();
      if (!text) continue;
      if (field.kind === "choice" && !field.options?.some((option) => option.value === text)) {
        throw new Error(`${field.label}：请选择有效选项。`);
      }
      if (text.length > (field.multiline ? 3000 : 200)) {
        throw new Error(`${field.label}：文字过长。`);
      }
      result[field.id] = text;
    }
  }
  return result as TradeResearchFields;
}

export function researchFieldsToDraft(fields: TradeResearchFields): ResearchDraft {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]));
}

export function researchDraftToFields(draft: ResearchDraft): TradeResearchFields {
  const values = Object.fromEntries(researchFields.flatMap((field) => {
    const value = draft[field.id]?.trim();
    return !value ? [] : [[field.id, field.kind === "number" ? Number(value) : value]];
  }));
  return normalizeResearchFields(values);
}

export function researchValueLabel(id: ResearchFieldId, value: string | number | undefined) {
  return researchFields.find((field) => field.id === id)?.options?.find((option) => option.value === value)?.label
    ?? (value == null || value === "" ? "未记录" : String(value));
}
