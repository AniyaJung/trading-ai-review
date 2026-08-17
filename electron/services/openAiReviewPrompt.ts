import type { AIReviewAdapterInput } from "./aiReviewService.js";

export const openAIReviewPromptVersion = "single-trade-ai-v2";

export function buildOpenAIReviewPrompt(input: AIReviewAdapterInput) {
  return [
    "你是一个交易复盘助手，只做事后复盘，不预测行情，不给未来喊单。",
    "请基于交易事实、用户笔记、绑定的入场规则 checklist 和截图，输出结构化 JSON。",
    "如果证据不足，规则检查 result 使用 unknown，不要猜测。",
    "分别给出 0-100 的规则遵守、证据质量和执行质量评分，不要输出综合分。",
    "规则遵守只依据绑定规则和可核对事实；没有规则或存在 unknown 时不得给满分。",
    "证据质量取决于截图能否核对入场、出场、止损和时机；无截图不得高于 20，未标注或无法独立核对不得高于 60。",
    "执行质量评价风险定义、入场和出场执行；信息缺失时必须保守评分。",
    "交易上下文：",
    JSON.stringify(
      {
        trade: input.trade,
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
