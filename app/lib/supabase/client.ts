"use client";

import { createClient } from "@supabase/supabase-js";
import { environment } from "../../environment";

const fallbackUrl = "https://ppmovugcdcxnfnklfxeu.supabase.co";
const fallbackPublishableKey = "sb_publishable_wozDGaSJzeSJMNElJ9bm-Q_aZD7t7C2";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackUrl;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? fallbackPublishableKey;

export function isSupabaseConfigured(): boolean {
  return environment.auth.enabled && Boolean(supabaseUrl && supabasePublishableKey);
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
