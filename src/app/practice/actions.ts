"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { loadBanks } from "@/lib/recall/banks";
import { TRACKS, type BankItem, type Progress, type Track } from "@/lib/recall/types";

export interface PracticeData {
  track: Track; today: string; items: BankItem[]; categories: string[]; companies: string[]; company_lists: string[];
  progress: Record<string, Progress>;
}

/** The whole bank for one track plus the caller's progress on it. Filtering, "start next" and random are client-side (as in v1). */
export async function getPractice(track: string): Promise<PracticeData> {
  if (!(TRACKS as string[]).includes(track)) throw new Error("bad track");
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("signed out");
  const [{ banks }, { data: rows }] = await Promise.all([loadBanks(supabase), supabase.from("progress").select("item_id,attempts,best,last,last_date,interval,next_due").eq("track", track)]);
  const progress: Record<string, Progress> = {};
  for (const r of rows ?? []) progress[r.item_id] = { attempts: r.attempts, best: r.best, last: r.last ?? undefined, last_date: r.last_date ?? undefined, interval: r.interval, next_due: r.next_due ?? undefined };
  const b = banks[track as Track];
  return { track: track as Track, today: new Date().toISOString().slice(0, 10), items: b.items, categories: b.categories, companies: b.companies ?? [], company_lists: Object.keys(b.company_lists ?? {}), progress };
}
