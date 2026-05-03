import type { Asset } from "../../lib/domain/types";

const assets: Asset[] = ["USDT", "SOL", "OKSOL", "BTC", "ETH"];

type AssetSelectProps = {
  value: Asset;
  onChange: (value: Asset) => void;
};

export function AssetSelect({ value, onChange }: AssetSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Asset)}>
      {assets.map((asset) => (
        <option key={asset} value={asset}>
          {asset}
        </option>
      ))}
    </select>
  );
}
