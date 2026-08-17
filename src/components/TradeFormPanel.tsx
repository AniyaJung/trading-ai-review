import { FilePlus2, Pencil } from "lucide-react";
import type { ClosedFuturesTradeCalculation } from "../../shared/trading/types";
import { buildRuleVersionLabel } from "../app/rulePanel";
import type { TradeFormState } from "../app/tradeForm";

type TradeFormPanelProps = {
  tradeForm: TradeFormState;
  entryRules: EntryRuleWithLatestVersion[];
  formPreview: ClosedFuturesTradeCalculation | null;
  formErrors: string[];
  formMessage: string;
  editingTradeId: number | null;
  instruments: InstrumentConfig[];
  onChange: (field: keyof TradeFormState, value: string) => void;
};

export function TradeFormPanel({
  tradeForm,
  entryRules,
  formPreview,
  formErrors,
  formMessage,
  editingTradeId,
  instruments,
  onChange,
}: TradeFormPanelProps) {
  const isEditing = editingTradeId != null;
  const ModeIcon = isEditing ? Pencil : FilePlus2;

  return (
    <section
      className="panel form-panel"
      aria-label={isEditing ? "编辑交易" : "新建交易"}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{isEditing ? "Editing trade" : "Trade entry"}</p>
          <h3>{isEditing ? `编辑交易 #${editingTradeId}` : "新建交易"}</h3>
        </div>
        <span className={`trade-form-mode ${isEditing ? "editing" : "new"}`}>
          <ModeIcon aria-hidden="true" size={15} />
          {isEditing ? "编辑中" : "新记录"}
        </span>
      </div>

      <div className="form-grid trade-form-grid">
        <label>
          品种
          <select
            value={tradeForm.symbol}
            onChange={(event) => onChange("symbol", event.currentTarget.value)}
          >
            {buildInstrumentOptions(instruments, tradeForm.symbol).map(
              (instrument) => (
                <option key={instrument.symbol} value={instrument.symbol}>
                  {instrument.symbol}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          方向
          <select
            value={tradeForm.direction}
            onChange={(event) =>
              onChange("direction", event.currentTarget.value)
            }
          >
            <option value="long">long</option>
            <option value="short">short</option>
          </select>
        </label>
        <label className="wide-field">
          入场规则
          <select
            value={tradeForm.entryRuleVersionId}
            onChange={(event) =>
              onChange("entryRuleVersionId", event.currentTarget.value)
            }
          >
            <option value="">暂不绑定规则</option>
            {entryRules.map((rule) => (
              <option key={rule.latestVersion.id} value={rule.latestVersion.id}>
                {buildRuleVersionLabel(rule)}
              </option>
            ))}
          </select>
        </label>
        <label>
          开仓时间
          <input
            type="datetime-local"
            value={tradeForm.openedAt}
            onChange={(event) => onChange("openedAt", event.currentTarget.value)}
          />
        </label>
        <label>
          平仓时间
          <input
            type="datetime-local"
            value={tradeForm.closedAt}
            onChange={(event) => onChange("closedAt", event.currentTarget.value)}
          />
        </label>
        <label>
          入场点位
          <input
            inputMode="decimal"
            value={tradeForm.entryPrice}
            onChange={(event) => onChange("entryPrice", event.currentTarget.value)}
          />
        </label>
        <label>
          出场点位
          <input
            inputMode="decimal"
            value={tradeForm.exitPrice}
            onChange={(event) => onChange("exitPrice", event.currentTarget.value)}
          />
        </label>
        <label>
          止损点位
          <input
            inputMode="decimal"
            value={tradeForm.stopLossPrice}
            onChange={(event) =>
              onChange("stopLossPrice", event.currentTarget.value)
            }
          />
        </label>
        <label>
          合约数
          <input
            inputMode="decimal"
            value={tradeForm.quantity}
            onChange={(event) => onChange("quantity", event.currentTarget.value)}
          />
        </label>
        <label>
          止盈点位
          <input
            inputMode="decimal"
            value={tradeForm.takeProfitPrice}
            onChange={(event) =>
              onChange("takeProfitPrice", event.currentTarget.value)
            }
          />
        </label>
        <label>
          手续费
          <input
            inputMode="decimal"
            value={tradeForm.feesTotal}
            onChange={(event) => onChange("feesTotal", event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="notes-grid">
        <label>
          入场理由
          <textarea
            value={tradeForm.entryReason}
            onChange={(event) => onChange("entryReason", event.currentTarget.value)}
          />
        </label>
        <label>
          出场理由
          <textarea
            value={tradeForm.exitReason}
            onChange={(event) => onChange("exitReason", event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="metric-strip">
        <div>
          <span>净盈亏</span>
          <strong>${formPreview?.netPnl ?? "-"}</strong>
        </div>
        <div>
          <span>R 倍数</span>
          <strong>{formPreview?.rMultiple ?? "-"}R</strong>
        </div>
        <div>
          <span>计划风险</span>
          <strong>${formPreview?.riskAmount ?? "-"}</strong>
        </div>
      </div>

      <div className={formErrors.length > 0 ? "form-status error" : "form-status"}>
        {formErrors.length > 0 ? (
          <ul>
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          formMessage
        )}
      </div>
    </section>
  );
}

function buildInstrumentOptions(
  instruments: InstrumentConfig[],
  selectedSymbol: string,
) {
  if (instruments.length > 0) {
    return instruments;
  }

  return [
    {
      symbol: selectedSymbol,
      name: selectedSymbol,
      assetClass: "futures" as const,
      exchange: "",
      currency: "USD",
      tickSize: 0,
      tickValue: 0,
      pointValue: 0,
    },
  ];
}
