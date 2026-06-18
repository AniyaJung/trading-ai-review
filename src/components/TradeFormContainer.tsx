import type { TradeWorkflow } from "../app/tradeWorkflow";
import { TradeFormPanel } from "./TradeFormPanel";

type TradeFormWorkflow = {
  state: Pick<
    TradeWorkflow["state"],
    | "tradeForm"
    | "formPreview"
    | "formErrors"
    | "formMessage"
    | "editingTradeId"
  >;
  actions: Pick<TradeWorkflow["actions"], "updateTradeForm">;
};

type TradeFormContainerProps = {
  workflow: TradeFormWorkflow;
  entryRules: EntryRuleWithLatestVersion[];
  instruments: InstrumentConfig[];
};

export function TradeFormContainer({
  workflow,
  entryRules,
  instruments,
}: TradeFormContainerProps) {
  const {
    tradeForm,
    formPreview,
    formErrors,
    formMessage,
    editingTradeId,
  } = workflow.state;

  return (
    <TradeFormPanel
      tradeForm={tradeForm}
      entryRules={entryRules}
      instruments={instruments}
      formPreview={formPreview}
      formErrors={formErrors}
      formMessage={formMessage}
      editingTradeId={editingTradeId}
      onChange={workflow.actions.updateTradeForm}
    />
  );
}
