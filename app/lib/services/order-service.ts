import type { AppState, AuditLog, DIOrder } from "../domain/types";
import { toUSDT } from "../domain/assets";
import { createId } from "./id";
import { getLatestPrices } from "./ledger-service";
import { evaluateOrder } from "./order-evaluation-service";

export type OrderInput = Omit<
  DIOrder,
  "id" | "status" | "settlementResult" | "receivedAsset" | "receivedAmount" | "settledAt" | "isDeleted" | "deletedAt" | "deleteReason" | "createdAt" | "updatedAt"
>;

export function createOrder(state: AppState, input: OrderInput): AppState {
  const now = new Date().toISOString();
  const prices = getLatestPrices(state);
  const subscribedCapitalValueAtStartUSDT = input.subscribedAsset === "USDT"
    ? input.subscribedAmount
    : toUSDT(input.subscribedAmount, input.subscribedAsset, prices) || input.subscribedAmount * input.strikePrice;
  const order: DIOrder = {
    ...input,
    id: createId("order"),
    subscribedCapitalValueAtStartUSDT,
    status: "ACTIVE",
    settlementResult: null,
    receivedAsset: null,
    receivedAmount: null,
    settledAt: null,
    isDeleted: false,
    deletedAt: null,
    deleteReason: null,
    createdAt: now,
    updatedAt: now
  };
  const evaluation = { ...evaluateOrder(order), orderId: order.id };
  const auditLog: AuditLog = {
    id: createId("audit"),
    portfolioId: state.portfolio.id,
    entityType: "DI_ORDER",
    entityId: order.id,
    action: "CREATE_ORDER",
    changedFields: [{ field: "order", oldValue: null, newValue: order }],
    reason: order.note ?? null,
    createdAt: now
  };

  return {
    ...state,
    orders: [order, ...state.orders],
    orderEvaluations: [evaluation, ...state.orderEvaluations],
    auditLogs: [auditLog, ...state.auditLogs]
  };
}

export function softDeleteOrder(state: AppState, orderId: string, reason: string): AppState {
  if (!reason.trim()) throw new Error("Delete note is required");
  const now = new Date().toISOString();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "ACTIVE") {
    throw new Error("Only active orders can be deleted. Settled orders require a settlement correction.");
  }

  return {
    ...state,
    orders: state.orders.map((item) =>
      item.id === orderId
        ? { ...item, status: "DELETED", isDeleted: true, deletedAt: now, deleteReason: reason, updatedAt: now }
        : item
    ),
    auditLogs: [
      {
        id: createId("audit"),
        portfolioId: state.portfolio.id,
        entityType: "DI_ORDER",
        entityId: orderId,
        action: "DELETE_ORDER",
        changedFields: [{ field: "status", oldValue: order.status, newValue: "DELETED" }],
        reason,
        createdAt: now
      },
      ...state.auditLogs
    ]
  };
}
