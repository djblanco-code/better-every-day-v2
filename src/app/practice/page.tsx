import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { PracticeClient } from "./practice-client";
import { sessionUser } from "@/lib/supabase/session";

// Browse a track: filters (difficulty, topic, list, company), "start next" (due > new > first), random.
export const dynamic = "force-dynamic";

export default async function Practice({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  const { track } = await searchParams;
  return <PracticeClient initialTrack={track ?? "leetcode"} />;
}
