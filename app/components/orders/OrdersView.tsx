import { money } from "../../lib/domain/format";
import type { AppState, DIOrder, OrderEvaluation } from "../../lib/domain/types";
import type { OrderDraft } from "../../lib/order-draft";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics, OrderSettlementResult } from "../../lib/view-models";
import { SectionHeading } from "../ui/SectionHeading";
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
  return (
    <div className="two-column">
      <section>
        <SectionHeading
          title="Active & History"
          meta={`${metrics.activeOrders.length} active - ${money(metrics.pendingPremium)} pending premium`}
        />
        <div className="order-list">
          {state.orders.filter((order) => !order.isDeleted).map((order) => (
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
      </section>

      <CreateOrderForm
        state={state}
        value={draft}
        evaluation={draftEvaluation}
        onChange={onDraftChange}
        onSubmit={onCreateOrder}
      />
    </div>
  );
}
