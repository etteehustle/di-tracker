import { useState } from "react";
import { money } from "../../lib/domain/format";
import type { AppState, DIOrder, OrderEvaluation } from "../../lib/domain/types";
import type { OrderDraft } from "../../lib/order-draft";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics, OrderSettlementResult } from "../../lib/view-models";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SectionHeading } from "../ui/SectionHeading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { CreateOrderForm } from "./CreateOrderForm";
import { OrderCard } from "./OrderCard";

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
  const [ordersTab, setOrdersTab] = useState("active");
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
    <Tabs value={ordersTab} onValueChange={setOrdersTab} className="orders-tabs">
      <TabsList aria-label="Order views">
        <TabsTrigger value="active">
          Active
          <Badge label={String(activeOrders.length)} tone="active" className="tab-count" />
        </TabsTrigger>
        <TabsTrigger value="history">
          History
          <Badge label={String(historyOrders.length)} className="tab-count" />
        </TabsTrigger>
        <TabsTrigger value="create">Create</TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        <SectionHeading
          title="Active Orders"
          meta={`${money(metrics.pendingPremium)} pending premium`}
        />
        {renderOrderList(activeOrders, "No active orders", "Create a new order when you are ready.")}
      </TabsContent>

      <TabsContent value="history">
        <SectionHeading title="History Orders" meta={`${historyOrders.length} settled orders`} />
        {renderOrderList(historyOrders, "No history orders")}
      </TabsContent>

      <TabsContent value="create">
      <CreateOrderForm
        state={state}
        value={draft}
        evaluation={draftEvaluation}
        onChange={onDraftChange}
          onSubmit={createOrder}
      />
      </TabsContent>
    </Tabs>
  );
}
