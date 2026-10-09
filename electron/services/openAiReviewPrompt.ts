import type { AIReviewAdapterInput } from "./aiReviewService.js";

export const openAIReviewPromptVersion = "single-trade-ai-v3";

export function buildOpenAIReviewPrompt(input: AIReviewAdapterInput) {
  return [
    "你是一个交易复盘助手，只做事后复盘，不预测行情，不给未来喊单。",
    "请基于交易事实、用户笔记、绑定的入场规则 checklist 和截图，输出结构化 JSON。",
    "如果证据不足，规则检查 result 使用 unknown，不要猜测。",
    "分别给出 0-100 的规则遵守、证据质量和执行质量评分，不要输出综合分。",
    "规则遵守只依据绑定规则和可核对事实；没有规则或存在 unknown 时不得给满分。",
    "证据质量取决于截图能否核对入场、出场、止损和时机；无截图不得高于 20，未标注或无法独立核对不得高于 60。",
    "执行质量评价风险定义、入场和出场执行；信息缺失时必须保守评分。",
    "研究记录是用户填写的观察与假设，不是已验证市场事实。吸收、衰竭和盘口事件不能证明机构意图或必然反转。",
    "区分原始判断来源的自报标记与软件实际保存时间；事后补录不得当作事前预测。预期方向不等于交易盈亏。",
    "只评价本笔交易，不从单笔结果宣称统计优势、胜率或未来盈利能力。未知字段保持未知，不从截图臆造精确 Delta、DOM、MAE、MFE。",
    "净盈亏已经使用实际成交价并扣除手续费，记录的滑点只作执行诊断，不再次扣除。",
    "交易上下文：",
    JSON.stringify(
      {
        trade: input.trade,
        researchRecord: input.researchRecord ?? null,
        attachments: input.attachments.map((attachment) => ({
          id: attachment.id,
          imageType: attachment.imageType,
          caption: attachment.caption,
        })),
      },
      null,
      2,
    ),
  ].join("\n");
}
