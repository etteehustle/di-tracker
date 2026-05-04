import { useState, type FormEvent } from "react";
import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getAvailableBalances } from "../../lib/services/ledger-service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { Input } from "../ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/Select";

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
            <Card className="card" key={pocket.id}>
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
            </Card>
          );
        })}
      </section>

      <Card className="panel">
        <h2>Capital & Merge</h2>
        <form className="form-grid" onSubmit={submitDeposit}>
          <label>
            Deposit pocket
            <Select value={depositPocketId} onValueChange={setDepositPocketId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activePockets.map((pocket) => (
                  <SelectItem key={pocket.id} value={pocket.id}>
                    {pocket.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label>
            USDT amount
            <FormattedNumberInput value={depositAmount} onChange={setDepositAmount} />
          </label>

          <label className="wide">
            Note
            <Input required value={depositNote} onChange={(event) => setDepositNote(event.target.value)} />
          </label>

          <Button className="wide" type="submit">Create deposit</Button>
        </form>
        <Button variant="secondary" onClick={mergeByPrompt}>Merge pockets by id</Button>
      </Card>
    </div>
  );
}
