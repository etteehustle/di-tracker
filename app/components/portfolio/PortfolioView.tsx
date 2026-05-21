import { useState } from "react";
import type { FormEvent } from "react";
import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getLedgerBalances, getLedgerExposureBalances } from "../../lib/services/ledger-service";
import type { PortfolioBuyInput } from "../../lib/services/portfolio-adjustment-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormattedNumberInput } from "../inputs/FormattedNumberInput";
import { Input } from "@/components/ui/input";
import { MetricCard } from "../display/MetricCard";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const buyAssets: PortfolioBuyInput["asset"][] = ["SOL", "OKSOL", "BTC", "ETH"];

function exposureLabel(asset: string): string {
  return asset === "USDT" ? "USDT" : `${asset}-equivalent`;
}

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
          <MetricCard label="Storage Value" value={money(metrics.storagePortfolioValue)} />
          <MetricCard label="External Net Deposit" value={money(metrics.netDeposited)} />
          <MetricCard label="Total Portfolio PnL" value={money(metrics.totalPortfolioPnl)} tone={metrics.totalPortfolioPnl >= 0 ? "green" : "red"} />
          <MetricCard label="Pending Premium" value={money(metrics.pendingPremium)} />
        </div>
        <h3>Exposure View</h3>
        <div className="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exposure</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getLedgerExposureBalances(state).map((balance) => (
                <TableRow key={balance.underlyingAsset}>
                  <TableCell>{exposureLabel(balance.underlyingAsset)}</TableCell>
                  <TableCell>{amount(balance.amount)}</TableCell>
                  <TableCell>{money(balance.valueUSDT)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <h3>Actual Asset Balance</h3>
        <div className="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Underlying</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getLedgerBalances(state).map((balance) => (
                <TableRow key={balance.asset}>
                  <TableCell>{balance.asset}</TableCell>
                  <TableCell>{amount(balance.amount)}</TableCell>
                  <TableCell>{balance.underlyingAsset}</TableCell>
                  <TableCell>{money(balance.valueUSDT)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <SelectGroup>
                  {buyAssets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectGroup>
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
