"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { amount, dateTime, hoursUntil, money, percent } from "../../lib/domain/format";
import type { DIOrder, OrderEvaluation } from "../../lib/domain/types";
import type { OrderSettlementResult } from "../../lib/view-models";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type OrderCardProps = {
  order: DIOrder;
  evaluation?: Pick<OrderEvaluation, "score" | "riskLevel">;
  pendingPremium?: number;
  onSettle?: (order: DIOrder, result: OrderSettlementResult) => void;
  onDelete?: (order: DIOrder) => void;
};

export function OrderCard({ order, evaluation, pendingPremium = 0, onSettle, onDelete }: OrderCardProps) {
  const [now, setNow] = useState(() => new Date());
  const productTone = order.productType.toLowerCase();
  const statusTone = order.status.toLowerCase();
  const productLabel = order.productType === "BUY_LOW" ? "BUY LOW" : "SELL HIGH";
  const settlementCountdown = `${hoursUntil(order.settlementTime, now).toFixed(1)}h`;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card className={`order-card ${productTone} ${statusTone}`}>
      <div className="order-title">
        <div>
          <Badge label={productLabel} tone={productTone} />
          <Badge label={order.status.replaceAll("_", " ")} tone={statusTone} />
        </div>
        <strong>
          {order.exchange} - {order.pair}
        </strong>
      </div>

      <div className="order-metrics">
        <span>
          Capital <b>{amount(order.subscribedAmount)} {order.subscribedAsset}</b>
        </span>
        <span>
          Strike <b>{money(order.strikePrice, 2)}</b>
        </span>
        <span>
          APR <b>{percent(order.aprPercent)}</b>
        </span>
        <span>
          Term <b>{percent(order.termRatePercent, 3)}</b>
        </span>
        <span>
          Premium <b>{amount(order.expectedPremiumAmount)} {order.expectedPremiumAsset}</b>
        </span>
        {order.status === "ACTIVE" && (
          <span>
            Pending premium <b>{money(pendingPremium)}</b>
          </span>
        )}
        {order.status === "ACTIVE" && (
          <span className="countdown-metric">
            Maturity <b>{settlementCountdown}</b>
            <small>{dateTime(order.settlementTime)}</small>
          </span>
        )}
      </div>

      <details>
        <summary>Outcome detail</summary>
        <p>If Hit: receive {amount(order.ifHitAmount)} {order.ifHitAsset}</p>
        <p>If Not Hit: receive {amount(order.ifNotHitAmount)} {order.ifNotHitAsset}</p>
        <p>Settlement: {dateTime(order.settlementTime)}</p>
        <p>Tags: {order.marketContextTags.join(", ") || "None"}</p>
        {evaluation && <p>Evaluation: {evaluation.score} - {evaluation.riskLevel} Risk</p>}
      </details>

      {order.status === "ACTIVE" && onSettle && (
        <div className="card-actions">
          <Button variant="secondary" onClick={() => onSettle(order, "HIT")}>Settle Hit</Button>
          <Button variant="secondary" onClick={() => onSettle(order, "NOT_HIT")}>Settle Not Hit</Button>
          {onDelete && (
            <Button variant="destructive" size="icon" title="Soft delete" onClick={() => onDelete(order)}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
