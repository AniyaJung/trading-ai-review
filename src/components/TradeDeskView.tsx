import type { ComponentProps } from "react";
import { TradeFormPanel } from "./TradeFormPanel";
import { TradeListPanel } from "./TradeListPanel";
import { TradeReviewPanel } from "./TradeReviewPanel";

type TradeDeskViewProps = {
  tradeList: ComponentProps<typeof TradeListPanel>;
  tradeForm: ComponentProps<typeof TradeFormPanel>;
  tradeReview: ComponentProps<typeof TradeReviewPanel>;
};

export function TradeDeskView({
  tradeList,
  tradeForm,
  tradeReview,
}: TradeDeskViewProps) {
  return (
    <section className="desk-grid">
      <TradeListPanel {...tradeList} />
      <TradeFormPanel {...tradeForm} />
      <TradeReviewPanel {...tradeReview} />
    </section>
  );
}
