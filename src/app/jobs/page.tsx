import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { OverviewClient } from "./overview-client";

// Job Tracker overview: stats, funnel, per-day bars, stage counts, search windows.
export const dynamic = "force-dynamic";

export default async function Jobs() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(SIGN_IN_PATH);
  return <OverviewClient />;
}
