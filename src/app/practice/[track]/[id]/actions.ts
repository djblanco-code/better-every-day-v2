"use server";
import { id as idS, longText, parse, track as trackS } from "@/lib/validate";
import { supabaseServer } from "@/lib/supabase/server";
import { TRACKS, type Track } from "@/lib/recall/types";
import { sessionUser } from "@/lib/supabase/session";

const isTrack = (t: string): t is Track => (TRACKS as string[]).includes(t);

/** Autosave the draft (debounced on the client). Returns the server timestamp so the client can show "saved". */
export async function saveDraft(track: string, itemId: string, text: string, startedAt: string | null): Promise<{ saved_at: string }> {
  if (!isTrack(track)) throw new Error("bad track");
  track = parse(trackS, track); itemId = parse(idS, itemId); text = parse(longText(50000), text ?? ""); startedAt = startedAt == null ? null : parse(longText(40), startedAt);
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  const now = new Date().toISOString();
  const { error } = await supabase.from("drafts").upsert(
    { user_id: data.user.id, track, item_id: itemId, text: text.slice(0, 50000), started_at: startedAt, updated_at: now },
    { onConflict: "user_id,track,item_id" },
  );
  if (error) throw new Error("save draft: " + error.message);
  return { saved_at: now };
}

export async function clearDraft(track: string, itemId: string): Promise<void> {
  if (!isTrack(track)) throw new Error("bad track");
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  await supabase.from("drafts").delete().eq("track", track).eq("item_id", itemId);
}
