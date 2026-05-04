import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import type { Asset, MarketContextTag, OrderEvaluation, ProductType } from "../../lib/domain/types";
import { contextTags, type OrderDraft } from "../../lib/order-draft";
import type { AppState } from "../../lib/domain/types";
import { AssetSelect } from "../ui/AssetSelect";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Checkbox } from "../ui/Checkbox";
import { DateTimePicker } from "../ui/DateTimePicker";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { Input } from "../ui/Input";
import { SectionHeading } from "../ui/SectionHeading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/Select";

type CreateOrderFormProps = {
  state: AppState;
  value: OrderDraft;
  evaluation: OrderEvaluation;
  onChange: (value: OrderDraft) => void;
  onSubmit: (value: OrderDraft) => void;
};

export function CreateOrderForm({ state, value, evaluation, onChange, onSubmit }: CreateOrderFormProps) {
  const settlementMinDate = new Date(value.startTime);
  settlementMinDate.setHours(0, 0, 0, 0);
  settlementMinDate.setDate(settlementMinDate.getDate() + 1);

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
    <Card className="panel">
      <SectionHeading title="Create Order" meta={`${evaluation.score} - ${evaluation.riskLevel} risk`} />
      <form className="form-grid" onSubmit={submit}>
        <label>
          Pocket
          <Select value={value.pocketId} onValueChange={(nextValue) => update("pocketId", nextValue)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.pockets.filter((pocket) => pocket.status === "ACTIVE").map((pocket) => (
                <SelectItem key={pocket.id} value={pocket.id}>
                  {pocket.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label>
          Product
          <Select value={value.productType} onValueChange={(nextValue) => update("productType", nextValue as ProductType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY_LOW">Buy Low</SelectItem>
              <SelectItem value="SELL_HIGH">Sell High</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label>
          Pair
          <Input value={value.pair} onChange={(event) => update("pair", event.target.value)} />
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
          <DateTimePicker label="Start" value={value.startTime} onChange={(nextValue) => update("startTime", nextValue)} />
        </label>

        <label>
          Settlement
          <DateTimePicker
            label="Settlement"
            value={value.settlementTime}
            disabled={{ before: settlementMinDate }}
            onChange={(nextValue) => update("settlementTime", nextValue)}
          />
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
              <Checkbox
                checked={value.marketContextTags.includes(tag)}
                onChange={(event) => toggleTag(tag, event.target.checked)}
              />
              {tag}
            </label>
          ))}
        </div>

        <label className="wide">
          Note
          <Input value={value.note ?? ""} onChange={(event) => update("note", event.target.value)} />
        </label>

        <div className="evaluation-box">
          <strong>{evaluation.score} - {evaluation.riskLevel} Risk - {evaluation.efficiencyLabel}</strong>
          <span>{evaluation.reasons.join(" ")}</span>
        </div>

        <Button className="wide" type="submit">
          <Plus size={18} />
          Save active order
        </Button>
      </form>
    </Card>
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
