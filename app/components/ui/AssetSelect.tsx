import type { Asset } from "../../lib/domain/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";

const assets: Asset[] = ["USDT", "SOL", "OKSOL", "BTC", "ETH"];

type AssetSelectProps = {
  value: Asset;
  onChange: (value: Asset) => void;
};

export function AssetSelect({ value, onChange }: AssetSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as Asset)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {assets.map((asset) => (
          <SelectItem key={asset} value={asset}>
            {asset}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
