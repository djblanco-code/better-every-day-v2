import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Per-user, per-minute ceiling on model calls (ASVS V13). The audit log is the counter: one row per attempt, so
// a burst of failures counts too. The monthly budget still bounds total spend; this bounds burst rate.
export const PER_MINUTE = 10;

export class RateLimited extends Error {}

export async function checkRateLimit(supabase: SupabaseClient, userId: string, limit = PER_MINUTE): Promise<void> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase.from("audit_log").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("at", since);
  if (error) return;   // never block on a counting error; the budget guard still applies
  if ((count ?? 0) >= limit) throw new RateLimited(`Too many AI calls in the last minute (${limit}). Wait a moment and try again.`);
}
