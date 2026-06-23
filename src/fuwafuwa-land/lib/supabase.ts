import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export type FuwafuwaSupabaseClient = SupabaseClient<Database>;

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

let client: FuwafuwaSupabaseClient | null = null;

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }
  if (typeof anonKey !== "string" || anonKey.trim().length === 0) {
    return null;
  }
  return { url, anonKey };
}

export function getSupabaseClient(): FuwafuwaSupabaseClient | null {
  const config = getSupabaseRuntimeConfig();
  if (config === null) {
    return null;
  }
  client ??= createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  });
  return client;
}
