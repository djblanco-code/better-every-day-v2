import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bank, Banks, Curriculum, Track } from "./types";
import { TRACKS } from "./types";

// Shared, read-only banks from public.banks, cached in memory for the server process. The `_meta` row per track
// carries bank-level data (categories, company lists, program settings). Shapes match supabase/seed/*.json.
let cache: { at: number; banks: Banks; cur: Curriculum; premium: Record<string, string> } | null = null;
const TTL = 10 * 60 * 1000;

type Row = { track: string; item_id: string; data: Record<string, unknown> };

export async function loadBanks(supabase: SupabaseClient): Promise<{ banks: Banks; cur: Curriculum; premium: Record<string, string> }> {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const { data, error } = await supabase.from("banks").select("track,item_id,data").limit(5000);
  if (error) throw new Error("banks: " + error.message);
  const rows = (data ?? []) as Row[];
  const by = (t: string) => rows.filter((r) => r.track === t);
  const bank = (t: Track): Bank => {
    const meta = by(t).find((r) => r.item_id === "_meta")?.data ?? {};
    const items = by(t).filter((r) => r.item_id !== "_meta").map((r) => r.data as unknown as Bank["items"][number]);
    const categories = (meta.categories as string[] | undefined) ?? [...new Set(items.map((i) => i.topic ?? ""))].sort();
    return { items, categories, companies: meta.companies as string[] | undefined, company_lists: (meta.company_lists as Record<string, string[]> | undefined) ?? {} };
  };
  const banks = Object.fromEntries(TRACKS.map((t) => [t, bank(t)])) as Banks;
  const cmeta = by("curriculum").find((r) => r.item_id === "_meta")?.data ?? {};
  const weeks = by("curriculum").filter((r) => r.item_id !== "_meta").map((r) => r.data as unknown as Curriculum["weeks"][number]).sort((a, b) => a.week - b.week);
  const cur: Curriculum = { weeks, daily_minutes: cmeta.daily_minutes as number | undefined, program_weeks: cmeta.program_weeks as number | undefined, principles: cmeta.principles as [string, string][] | undefined };
  const premium = Object.fromEntries(by("premium_statements").map((r) => [r.item_id, String((r.data as { text: string }).text)]));
  cache = { at: Date.now(), banks, cur, premium };
  return cache;
}

export function findItem(banks: Banks, track: Track, id: string) {
  return banks[track]?.items.find((i) => i.id === id) ?? null;
}
