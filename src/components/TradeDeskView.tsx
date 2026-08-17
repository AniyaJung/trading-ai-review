import { useEffect, type ComponentProps } from "react";
import { TradeFormContainer } from "./TradeFormContainer";
import { TradeListContainer } from "./TradeListContainer";
import { TradeReviewContainer } from "./TradeReviewContainer";

type TradeDeskViewProps = {
  isTradeFormOpen: boolean;
  tradeList: ComponentProps<typeof TradeListContainer>;
  tradeForm: ComponentProps<typeof TradeFormContainer>;
  tradeReview: ComponentProps<typeof TradeReviewContainer>;
};

export function TradeDeskView({
  isTradeFormOpen,
  tradeList,
  tradeForm,
  tradeReview,
}: TradeDeskViewProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isTradeFormOpen]);

  return (
    <section
      className={`desk-grid ${isTradeFormOpen ? "form-mode" : "browse-mode"}`}
    >
      {isTradeFormOpen ? (
        <TradeFormContainer {...tradeForm} />
      ) : (
        <>
          <TradeListContainer {...tradeList} />
          <TradeReviewContainer {...tradeReview} />
        </>
      )}
    </section>
  );
}
