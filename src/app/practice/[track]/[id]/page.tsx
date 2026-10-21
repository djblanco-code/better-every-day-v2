import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { findItem, loadBanks } from "@/lib/recall/banks";
import { statementFor } from "@/lib/recall/statement";
import { TRACKS, type Track } from "@/lib/recall/types";
import { SessionClient } from "./session-client";

// A session is one document: the problem on top, your writing below. Nothing runs. The timer starts only on Start.
export const dynamic = "force-dynamic";

export default async function Session({ params }: { params: Promise<{ track: string; id: string }> }) {
  const { track, id } = await params;
  if (!(TRACKS as string[]).includes(track)) notFound();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(SIGN_IN_PATH);
  const { banks, premium } = await loadBanks(supabase);
  const item = findItem(banks, track as Track, decodeURIComponent(id));
  if (!item) notFound();
  const [{ data: draft }, { data: prog }] = await Promise.all([
    supabase.from("drafts").select("text,started_at").eq("track", track).eq("item_id", item.id).maybeSingle(),
    supabase.from("progress").select("attempts,best").eq("track", track).eq("item_id", item.id).maybeSingle(),
  ]);
  const statement = statementFor(track as Track, item, premium);
  return (
    <SessionClient
      track={track as Track}
      item={{ id: item.id, title: item.title, difficulty: String(item.difficulty ?? ""), topic: item.topic ?? "", url: item.url }}
      statement={statement}
      draft={{ text: draft?.text ?? "", startedAt: draft?.started_at ?? null }}
      best={prog?.best ?? null}
      attempts={prog?.attempts ?? 0}
    />
  );
}
