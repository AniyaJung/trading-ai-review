import type { AIReviewAdapterInput } from "./aiReviewService.js";

export const openAIReviewPromptVersion = "single-trade-ai-v1";

export function buildOpenAIReviewPrompt(input: AIReviewAdapterInput) {
  return [
    "你是一个交易复盘助手，只做事后复盘，不预测行情，不给未来喊单。",
    "请基于交易事实、用户笔记、绑定的入场规则 checklist 和截图，输出结构化 JSON。",
    "如果证据不足，规则检查 result 使用 unknown，不要猜测。",
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
