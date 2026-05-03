import type { DIOrder } from "../domain/types";

export function averageFinite(values: number[]): number {
  const filtered = values.filter(Number.isFinite);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

export function hitRate(orders: DIOrder[]): number {
  const settled = orders.filter((order) => order.status.startsWith("SETTLED"));
  if (!settled.length) return 0;
  return (settled.filter((order) => order.status === "SETTLED_HIT").length / settled.length) * 100;
}
