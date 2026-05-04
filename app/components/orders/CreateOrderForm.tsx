import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { Asset, MarketContextTag, OrderEvaluation, ProductType } from "../../lib/domain/types";
import { dateTimeInput, parseDateTimeInput } from "../../lib/domain/format";
import { contextTags, type OrderDraft } from "../../lib/order-draft";
import type { AppState } from "../../lib/domain/types";
import { AssetSelect } from "../ui/AssetSelect";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { SectionHeading } from "../ui/SectionHeading";

type CreateOrderFormProps = {
  state: AppState;
  value: OrderDraft;
  evaluation: OrderEvaluation;
  onChange: (value: OrderDraft) => void;
  onSubmit: (value: OrderDraft) => void;
};

export function CreateOrderForm({ state, value, evaluation, onChange, onSubmit }: CreateOrderFormProps) {
  function update<K extends keyof OrderDraft>(key: K, nextValue: OrderDraft[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  function toggleTag(tag: MarketContextTag, checked: boolean) {
    update(
      "marketContextTags",
      checked ? [...value.marketContextTags, tag] : value.marketContextTags.filter((item) => item !== tag)
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <section className="panel">
      <SectionHeading title="Create Order" meta={`${evaluation.score} - ${evaluation.riskLevel} risk`} />
      <form className="form-grid" onSubmit={submit}>
        <label>
          Pocket
          <select value={value.pocketId} onChange={(event) => update("pocketId", event.target.value)}>
            {state.pockets.filter((pocket) => pocket.status === "ACTIVE").map((pocket) => (
              <option key={pocket.id} value={pocket.id}>
                {pocket.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Product
          <select value={value.productType} onChange={(event) => update("productType", event.target.value as ProductType)}>
            <option value="BUY_LOW">Buy Low</option>
            <option value="SELL_HIGH">Sell High</option>
          </select>
        </label>

        <label>
          Pair
          <input value={value.pair} onChange={(event) => update("pair", event.target.value)} />
        </label>

        <label>
          Subscribed asset
          <AssetSelect value={value.subscribedAsset} onChange={(asset) => update("subscribedAsset", asset)} />
        </label>

        <NumericField label="Subscribed amount" value={value.subscribedAmount} onChange={(amount) => update("subscribedAmount", amount)} />
        <NumericField label="Strike" value={value.strikePrice} onChange={(amount) => update("strikePrice", amount)} />
        <NumericField label="APR %" value={value.aprPercent} onChange={(amount) => update("aprPercent", amount)} />
        <NumericField label="Term rate %" value={value.termRatePercent} onChange={(amount) => update("termRatePercent", amount)} />

        <label>
          Start
          <DateTimeField value={value.startTime} onChange={(nextValue) => update("startTime", nextValue)} />
        </label>

        <label>
          Settlement
          <DateTimeField value={value.settlementTime} onChange={(nextValue) => update("settlementTime", nextValue)} />
        </label>

        <NumericField label="Premium amount" value={value.expectedPremiumAmount} onChange={(amount) => update("expectedPremiumAmount", amount)} />
        <label>
          Premium asset
          <AssetSelect value={value.expectedPremiumAsset} onChange={(asset) => update("expectedPremiumAsset", asset)} />
        </label>

        <NumericField label="If hit amount" value={value.ifHitAmount} onChange={(amount) => update("ifHitAmount", amount)} />
        <label>
          If hit asset
          <AssetSelect value={value.ifHitAsset} onChange={(asset) => update("ifHitAsset", asset)} />
        </label>

        <NumericField label="If not hit amount" value={value.ifNotHitAmount} onChange={(amount) => update("ifNotHitAmount", amount)} />
        <label>
          If not hit asset
          <AssetSelect value={value.ifNotHitAsset} onChange={(asset: Asset) => update("ifNotHitAsset", asset)} />
        </label>

        <div className="tag-grid">
          {contextTags.map((tag) => (
            <label key={tag} className="check-label">
              <input
                type="checkbox"
                checked={value.marketContextTags.includes(tag)}
                onChange={(event) => toggleTag(tag, event.target.checked)}
              />
              {tag}
            </label>
          ))}
        </div>

        <label className="wide">
          Note
          <input value={value.note ?? ""} onChange={(event) => update("note", event.target.value)} />
        </label>

        <div className="evaluation-box">
          <strong>{evaluation.score} - {evaluation.riskLevel} Risk - {evaluation.efficiencyLabel}</strong>
          <span>{evaluation.reasons.join(" ")}</span>
        </div>

        <button className="primary wide" type="submit">
          <Plus size={18} />
          Save active order
        </button>
      </form>
    </section>
  );
}

function NumericField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <FormattedNumberInput value={value} onChange={onChange} />
    </label>
  );
}

function DateTimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [displayValue, setDisplayValue] = useState(dateTimeInput(value));

  useEffect(() => {
    setDisplayValue(dateTimeInput(value));
  }, [value]);

  function commit(nextDisplayValue: string) {
    setDisplayValue(nextDisplayValue);
    const parsed = parseDateTimeInput(nextDisplayValue);
    if (parsed) onChange(parsed);
  }

  return (
    <input
      inputMode="numeric"
      placeholder="dd/MM/YYYY HH:mm"
      value={displayValue}
      onChange={(event) => commit(event.target.value)}
      onBlur={() => setDisplayValue(dateTimeInput(value))}
    />
  );
}
