import { useState } from "react";
import { money } from "../../lib/domain/format";
import type { AppState, DIOrder, OrderEvaluation } from "../../lib/domain/types";
import type { OrderDraft } from "../../lib/order-draft";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics, OrderSettlementResult } from "../../lib/view-models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "../display/SectionHeading";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreateOrderForm } from "./CreateOrderForm";
import { OrderCard } from "./OrderCard";

type OrdersTab = "active" | "history" | "create";

type OrdersViewProps = {
  state: AppState;
  metrics: DashboardMetrics;
  draft: OrderDraft;
  draftEvaluation: OrderEvaluation;
  onDraftChange: (draft: OrderDraft) => void;
  onCreateOrder: (draft: OrderDraft) => void;
  onSettleOrder: (order: DIOrder, result: OrderSettlementResult) => void;
  onDeleteOrder: (order: DIOrder) => void;
};

export function OrdersView({
  state,
  metrics,
  draft,
  draftEvaluation,
  onDraftChange,
  onCreateOrder,
  onSettleOrder,
  onDeleteOrder
}: OrdersViewProps) {
  const [ordersTab, setOrdersTab] = useState<OrdersTab>("active");
  const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
  const historyOrders = state.orders.filter((order) => order.status !== "ACTIVE" && !order.isDeleted);

  function createOrder(nextDraft: OrderDraft) {
    onCreateOrder(nextDraft);
    setOrdersTab("active");
  }

  function renderOrderList(orders: DIOrder[], emptyTitle: string, emptyAction?: string) {
    if (!orders.length) {
      return (
        <Card className="orders-empty-state">
          <strong>{emptyTitle}</strong>
          {emptyAction && <span>{emptyAction}</span>}
          {emptyAction && (
            <Button variant="secondary" onClick={() => setOrdersTab("create")}>
              Create order
            </Button>
          )}
        </Card>
      );
    }

    return (
      <div className="order-list">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            evaluation={state.orderEvaluations.find((item) => item.orderId === order.id)}
            pendingPremium={activeOrderPendingPremiumUSDT(order, metrics.prices)}
            onSettle={onSettleOrder}
            onDelete={onDeleteOrder}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="orders-tabs">
      <ToggleGroup
        type="single"
        value={ordersTab}
        onValueChange={(value) => value && setOrdersTab(value as OrdersTab)}
        aria-label="Order views"
      >
        <ToggleGroupItem value="active">
          Active
          <Badge variant="secondary" className="tab-count">{activeOrders.length}</Badge>
        </ToggleGroupItem>
        <ToggleGroupItem value="history">
          History
          <Badge variant="secondary" className="tab-count">{historyOrders.length}</Badge>
        </ToggleGroupItem>
        <ToggleGroupItem value="create">Create</ToggleGroupItem>
      </ToggleGroup>

      <div className="orders-panel">
        {ordersTab === "active" && (
          <>
            <SectionHeading
              title="Active Orders"
              meta={`${money(metrics.pendingPremium)} pending premium`}
            />
            {renderOrderList(activeOrders, "No active orders", "Create a new order when you are ready.")}
          </>
        )}

        {ordersTab === "history" && (
          <>
            <SectionHeading title="History Orders" meta={`${historyOrders.length} settled orders`} />
            {renderOrderList(historyOrders, "No history orders")}
          </>
        )}

        {ordersTab === "create" && (
          <CreateOrderForm
            state={state}
            value={draft}
            evaluation={draftEvaluation}
            onChange={onDraftChange}
            onSubmit={createOrder}
          />
        )}
      </div>
    </section>
  );
}
