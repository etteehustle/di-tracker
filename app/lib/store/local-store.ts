"use client";

import type { AppState } from "../domain/types";
import { environment } from "../../environment";
import { seedState } from "./mock-data";

const now = "2026-05-03T00:00:00.000Z";

const emptyState: AppState = {
  user: {
    id: "user_main",
    name: "Personal DI Operator",
    baseCurrency: "USDT",
    createdAt: now,
    updatedAt: now
  },
  portfolio: {
    id: "portfolio_main",
    userId: "user_main",
    name: "Main Portfolio",
    baseCurrency: "USDT",
    createdAt: now,
    updatedAt: now
  },
  pockets: [
    {
      id: "pocket_core_sol",
      portfolioId: "portfolio_main",
      name: "Core SOL DI",
      status: "ACTIVE",
      mergedIntoPocketId: null,
      mergedAt: null,
      createdAt: now,
      updatedAt: now,
      note: "Primary DI pocket"
    },
    {
      id: "pocket_extra",
      portfolioId: "portfolio_main",
      name: "Extra Capital",
      status: "ACTIVE",
      mergedIntoPocketId: null,
      mergedAt: null,
      createdAt: now,
      updatedAt: now,
      note: "Secondary DI pocket"
    }
  ],
  capitalMovements: [],
  ledgerEntries: [],
  costBasisLots: [],
  orders: [],
  priceSnapshots: [],
  orderEvaluations: [],
  auditLogs: []
};

function getInitialState(): AppState {
  return environment.mock.enabled ? seedState : emptyState;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return null;
  return storage;
}

export function loadState(): AppState {
  const storage = getBrowserStorage();
  if (!storage) return getInitialState();
  const raw = storage.getItem(environment.storageKey);
  if (!raw) return getInitialState();
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return getInitialState();
  }
}

export function saveState(state: AppState): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(environment.storageKey, JSON.stringify(state));
}

export function resetState(): AppState {
  getBrowserStorage()?.removeItem(environment.storageKey);
  return getInitialState();
}
