import type { TagCategory } from "./statsContracts.js";

export type TagSource = "ai_review" | "manual";

export type TagDefinition = {
  id: number;
  name: string;
  category: TagCategory;
  tradeCount: number;
  aiReviewTradeCount: number;
  manualTradeCount: number;
  createdAt: string;
};

export type TradeTagAssignment = {
  tradeId: number;
  tagId: number;
  name: string;
  category: TagCategory;
  source: TagSource;
};

export type CreateTagInput = {
  name: string;
  category: TagCategory;
};

export type AssignTradeTagInput = {
  tradeId: number;
  tagId: number;
};

export type DeleteTagResult = {
  deleted: boolean;
  affectedTradeCount: number;
};
