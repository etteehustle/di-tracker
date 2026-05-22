import { useState, type FormEvent } from "react";
import { amount, dateTime, money } from "../../lib/domain/format";
import type { AppState, Asset } from "../../lib/domain/types";
import { getAvailableBalances } from "../../lib/services/ledger-service";
import type { CapitalAdjustmentInput } from "../../lib/services/portfolio-adjustment-service";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PocketsViewProps = {
  state: AppState;
  onDeposit: (pocketId: string, amount: number, note: string) => void;
  onAdjustment: (input: CapitalAdjustmentInput) => void;
  onMerge: (sourcePocketId: string, targetPocketId: string, note: string) => void;
};

const adjustmentAssets: Asset[] = ["USDT", "BTC", "ETH", "SOL", "OKSOL"];

export function PocketsView({ state, onDeposit, onAdjustment, onMerge }: PocketsViewProps) {
  const activePockets = state.pockets.filter((pocket) => pocket.status === "ACTIVE");
  const [depositAmount, setDepositAmount] = useState(500);
  const [depositPocketId, setDepositPocketId] = useState(activePockets[0]?.id ?? "");
  const [depositNote, setDepositNote] = useState("New DI capital");
  const [adjustmentPocketId, setAdjustmentPocketId] = useState(activePockets[0]?.id ?? "");
  const [adjustmentAsset, setAdjustmentAsset] = useState<Asset>("OKSOL");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"ADD" | "SUBTRACT">("ADD");
  const [adjustmentAmount, setAdjustmentAmount] = useState(0.01);
  const [adjustmentValueUSDTAtTime, setAdjustmentValueUSDTAtTime] = useState(0.84);
  const [adjustmentNote, setAdjustmentNote] = useState("Existing OKX OKSOL dust before transfer");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("pocket_extra");
  const [mergeTargetId, setMergeTargetId] = useState("pocket_core_sol");
  const [mergeNote, setMergeNote] = useState("Merge back to core");

  function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDeposit(depositPocketId, depositAmount, depositNote);
  }

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const signedAmount = adjustmentDirection === "ADD" ? adjustmentAmount : -adjustmentAmount;
    onAdjustment({
      pocketId: adjustmentPocketId,
      asset: adjustmentAsset,
      amount: signedAmount,
      valueUSDTAtTime: adjustmentAsset === "USDT" ? undefined : adjustmentValueUSDTAtTime,
      note: adjustmentNote
    });
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

        <h3>Balance Adjustment</h3>
        <p className="panel-note">Adjustments reconcile dust and rounding. They change balances without changing external net deposit.</p>
        <form className="form-grid" onSubmit={submitAdjustment}>
          <label>
            Pocket
            <Select value={adjustmentPocketId} onValueChange={setAdjustmentPocketId}>
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
            Asset
            <Select value={adjustmentAsset} onValueChange={(nextValue) => setAdjustmentAsset(nextValue as Asset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {adjustmentAssets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <label>
            Direction
            <Select value={adjustmentDirection} onValueChange={(nextValue) => setAdjustmentDirection(nextValue as "ADD" | "SUBTRACT")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ADD">Add</SelectItem>
                  <SelectItem value="SUBTRACT">Subtract</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <label>
            Amount
            <FormattedNumberInput value={adjustmentAmount} onChange={setAdjustmentAmount} />
          </label>

          {adjustmentAsset !== "USDT" && (
            <label className="wide">
              USDT value at time
              <FormattedNumberInput value={adjustmentValueUSDTAtTime} onChange={setAdjustmentValueUSDTAtTime} />
            </label>
          )}

          <label className="wide">
            Note
            <Input required value={adjustmentNote} onChange={(event) => setAdjustmentNote(event.target.value)} />
          </label>

          <Button className="wide" type="submit">Record adjustment</Button>
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

      <section className="panel movement-history-panel">
        <h2>Capital Movement History</h2>
        <div className="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>USDT value</TableHead>
                <TableHead>Pocket</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.capitalMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{movement.type}</TableCell>
                  <TableCell>{movement.asset}</TableCell>
                  <TableCell>{amount(movement.amount)} {movement.asset}</TableCell>
                  <TableCell>{money(movement.valueUSDTAtTime ?? movement.amount)}</TableCell>
                  <TableCell>{movement.toPocketId ?? movement.fromPocketId ?? "Portfolio"}</TableCell>
                  <TableCell>{dateTime(movement.movementTime)}</TableCell>
                  <TableCell>{movement.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
