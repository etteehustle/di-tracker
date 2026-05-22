"use client";

import type { User } from "@supabase/supabase-js";
import type { AppState } from "../domain/types";
import { createInitialStateForUser } from "./local-store";
import { supabase } from "../supabase/client";

type AppStateRow = {
  state: AppState;
};

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function ensureProfile(user: User): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: user.email ?? "Personal DI Operator"
    }, { onConflict: "id" });

  if (error) throw error;
}

export async function loadCloudState(user: User): Promise<AppState> {
  const client = requireSupabase();
  await ensureProfile(user);

  const { data, error } = await client
    .from("app_states")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle<AppStateRow>();

  if (error) throw error;
  return data?.state ?? createInitialStateForUser(user.id, user.email);
}

export async function saveCloudState(userId: string, state: AppState): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("app_states")
    .upsert({
      user_id: userId,
      state,
      schema_version: 1
    }, { onConflict: "user_id" });

  if (error) throw error;
}
