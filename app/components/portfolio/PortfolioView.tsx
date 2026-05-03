import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getLedgerBalances } from "../../lib/services/ledger-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { MetricCard } from "../ui/MetricCard";

type PortfolioViewProps = {
  state: AppState;
  metrics: DashboardMetrics;
};

export function PortfolioView({ state, metrics }: PortfolioViewProps) {
  return (
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
  );
}
