import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { sessionUser } from "@/lib/supabase/session";
import { InsightsClient } from "./insights/insights-client";

// Job Tracker landing: Insights (headline numbers, weekly applications, how far they got, where things stand).
export const dynamic = "force-dynamic";

export default async function Jobs() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <InsightsClient />;
}
