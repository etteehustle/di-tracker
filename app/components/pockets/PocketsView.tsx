import { useState, type FormEvent } from "react";
import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getAvailableBalances } from "../../lib/services/ledger-service";
import { Badge } from "../ui/Badge";

type PocketsViewProps = {
  state: AppState;
  onDeposit: (pocketId: string, amount: number, note: string) => void;
  onMerge: (sourcePocketId: string, targetPocketId: string, note: string) => void;
};

export function PocketsView({ state, onDeposit, onMerge }: PocketsViewProps) {
  const activePockets = state.pockets.filter((pocket) => pocket.status === "ACTIVE");
  const [depositAmount, setDepositAmount] = useState(500);
  const [depositPocketId, setDepositPocketId] = useState(activePockets[0]?.id ?? "");
  const [depositNote, setDepositNote] = useState("New DI capital");

  function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDeposit(depositPocketId, depositAmount, depositNote);
  }

  function mergeByPrompt() {
    const source = window.prompt("Source pocket id", "pocket_extra");
    const target = window.prompt("Target pocket id", "pocket_core_sol");
    const note = window.prompt("Merge note", "Merge back to core");
    if (source && target && note) onMerge(source, target, note);
  }

  return (
    <div className="two-column">
      <section className="card-grid">
        {state.pockets.map((pocket) => {
          const balances = getAvailableBalances(state, pocket.id);
          return (
            <article className="card" key={pocket.id}>
              <Badge label={pocket.status} tone={pocket.status.toLowerCase()} />
              <h3>{pocket.name}</h3>
              <p>{pocket.note}</p>
              <div className="mini-list">
                {balances.map((balance) => (
                  <span key={balance.asset}>
                    {amount(balance.amount)} {balance.asset} - {money(balance.valueUSDT)}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <h2>Capital & Merge</h2>
        <form className="form-grid" onSubmit={submitDeposit}>
          <label>
            Deposit pocket
            <select value={depositPocketId} onChange={(event) => setDepositPocketId(event.target.value)}>
              {activePockets.map((pocket) => (
                <option key={pocket.id} value={pocket.id}>
                  {pocket.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            USDT amount
            <input type="number" value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} />
          </label>

          <label className="wide">
            Note
            <input required value={depositNote} onChange={(event) => setDepositNote(event.target.value)} />
          </label>

          <button className="primary wide" type="submit">Create deposit</button>
        </form>
        <button className="secondary" onClick={mergeByPrompt}>Merge pockets by id</button>
      </section>
    </div>
  );
}
