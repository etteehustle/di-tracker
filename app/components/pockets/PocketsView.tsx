import { useState, type FormEvent } from "react";
import { amount, money } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { getAvailableBalances } from "../../lib/services/ledger-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormattedNumberInput } from "../inputs/FormattedNumberInput";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("pocket_extra");
  const [mergeTargetId, setMergeTargetId] = useState("pocket_core_sol");
  const [mergeNote, setMergeNote] = useState("Merge back to core");

  function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDeposit(depositPocketId, depositAmount, depositNote);
  }

  function submitMerge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mergeSourceId.trim() || !mergeTargetId.trim() || !mergeNote.trim()) return;
    onMerge(mergeSourceId, mergeTargetId, mergeNote);
    setMergeOpen(false);
  }

  return (
    <div className="two-column">
      <section className="card-grid">
        {state.pockets.map((pocket) => {
          const balances = getAvailableBalances(state, pocket.id);
          return (
            <Card className="card" key={pocket.id}>
              <div className="pocket-card-header">
                <Badge variant="secondary" className={pocket.status.toLowerCase()}>{pocket.status}</Badge>
                <small>{pocket.id}</small>
              </div>
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
        <p className="panel-note">Deposits add external DI capital. Merges are internal transfers and should not create PnL.</p>
        <form className="form-grid" onSubmit={submitDeposit}>
          <label>
            Deposit pocket
            <Select value={depositPocketId} onValueChange={setDepositPocketId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activePockets.map((pocket) => (
                    <SelectItem key={pocket.id} value={pocket.id}>
                      {pocket.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
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
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary">Merge pockets by id</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Pockets</DialogTitle>
              <DialogDescription>
                Move capital from a source pocket into a target pocket.
              </DialogDescription>
            </DialogHeader>
            <form className="form-grid" onSubmit={submitMerge}>
              <Field>
                <FieldLabel htmlFor="merge-source">Source pocket</FieldLabel>
                <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
                  <SelectTrigger id="merge-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {state.pockets.map((pocket) => (
                        <SelectItem key={pocket.id} value={pocket.id}>
                          {pocket.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="merge-target">Target pocket</FieldLabel>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger id="merge-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {activePockets.map((pocket) => (
                        <SelectItem key={pocket.id} value={pocket.id}>
                          {pocket.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="wide">
                <FieldLabel htmlFor="merge-note">Merge note</FieldLabel>
                <Input id="merge-note" required value={mergeNote} onChange={(event) => setMergeNote(event.target.value)} />
              </Field>
              <DialogFooter className="wide">
                <Button type="button" variant="ghost" onClick={() => setMergeOpen(false)}>Cancel</Button>
                <Button type="submit">Merge pockets</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
