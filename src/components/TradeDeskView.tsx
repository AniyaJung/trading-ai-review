import type { ComponentProps } from "react";
import { TradeFormContainer } from "./TradeFormContainer";
import { TradeListContainer } from "./TradeListContainer";
import { TradeReviewContainer } from "./TradeReviewContainer";

type TradeDeskViewProps = {
  tradeList: ComponentProps<typeof TradeListContainer>;
  tradeForm: ComponentProps<typeof TradeFormContainer>;
  tradeReview: ComponentProps<typeof TradeReviewContainer>;
};

export function TradeDeskView({
  tradeList,
  tradeForm,
  tradeReview,
}: TradeDeskViewProps) {
  return (
    <section className="desk-grid">
      <TradeListContainer {...tradeList} />
      <TradeFormContainer {...tradeForm} />
      <TradeReviewContainer {...tradeReview} />
    </section>
  );
}
