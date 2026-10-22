import { redirect } from "next/navigation";
<<<<<<< HEAD

// Insights is the Job Tracker landing page now.
export default function Insights() { redirect("/jobs"); }
=======
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { InsightsClient } from "./insights-client";
import { sessionUser } from "@/lib/supabase/session";

// Insights: applications per day, stage counts, funnel, per search window.
export const dynamic = "force-dynamic";

export default async function Insights() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <InsightsClient />;
}
>>>>>>> origin/main
