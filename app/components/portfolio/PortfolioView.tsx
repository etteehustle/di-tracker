import { useState } from "react";
import type { FormEvent } from "react";
import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getLedgerBalances } from "../../lib/services/ledger-service";
import type { PortfolioBuyInput } from "../../lib/services/portfolio-adjustment-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { Input } from "../ui/Input";
import { MetricCard } from "../ui/MetricCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/Select";

const buyAssets: PortfolioBuyInput["asset"][] = ["SOL", "OKSOL", "BTC", "ETH"];

type PortfolioViewProps = {
  state: AppState;
  metrics: DashboardMetrics;
  onRecordBuy: (input: PortfolioBuyInput) => void;
};

export function PortfolioView({ state, metrics, onRecordBuy }: PortfolioViewProps) {
  const [buyForm, setBuyForm] = useState<PortfolioBuyInput>({
    asset: "BTC",
    amount: 0,
    costUSDT: 0,
    note: ""
  });

  function updateBuyForm<K extends keyof PortfolioBuyInput>(key: K, value: PortfolioBuyInput[K]) {
    setBuyForm((current) => ({ ...current, [key]: value }));
  }

  function submitBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRecordBuy(buyForm);
    setBuyForm((current) => ({ ...current, amount: 0, costUSDT: 0, note: "" }));
  }

  return (
    <>
      <section className="panel">
        <h2>Portfolio Overview</h2>
        <div className="stat-row">
          <MetricCard label="Portfolio Total Value" value={money(metrics.portfolioTotal)} />
          <MetricCard label="DI Value" value={money(metrics.diValue)} />
          <MetricCard label="Pending Premium" value={money(metrics.pendingPremium)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Amount</th>
                <th>Underlying</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {getLedgerBalances(state).map((balance) => (
                <tr key={balance.asset}>
                  <td>{balance.asset}</td>
                  <td>{amount(balance.amount)}</td>
                  <td>{balance.underlyingAsset}</td>
                  <td>{money(balance.valueUSDT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Card className="panel">
        <h2>Record Portfolio Buy</h2>
        <form className="form-grid portfolio-buy-form" onSubmit={submitBuy}>
          <label>
            Asset
            <Select value={buyForm.asset} onValueChange={(nextValue) => updateBuyForm("asset", nextValue as PortfolioBuyInput["asset"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {buyAssets.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            Coin amount
            <FormattedNumberInput value={buyForm.amount} onChange={(amount) => updateBuyForm("amount", amount)} />
          </label>
          <label>
            USDT spent
            <FormattedNumberInput value={buyForm.costUSDT} onChange={(costUSDT) => updateBuyForm("costUSDT", costUSDT)} />
          </label>
          <label className="wide">
            Note
            <Input value={buyForm.note} onChange={(event) => updateBuyForm("note", event.target.value)} />
          </label>
          <Button className="wide" type="submit">Record buy</Button>
        </form>
      </Card>
    </>
  );
}
