"use client";

import type { AppState } from "../domain/types";
import { seedState } from "./mock-data";

const STORAGE_KEY = "di-tracker-state-v1";

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return null;
  return storage;
}

export function loadState(): AppState {
  const storage = getBrowserStorage();
  if (!storage) return seedState;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return seedState;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return seedState;
  }
}

export function saveState(state: AppState): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): AppState {
  getBrowserStorage()?.removeItem(STORAGE_KEY);
  return seedState;
}
