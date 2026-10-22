import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
<<<<<<< HEAD
=======
import { PipelineClient } from "./pipeline-client";
>>>>>>> origin/main
import { sessionUser } from "@/lib/supabase/session";
import { InsightsClient } from "./insights/insights-client";

<<<<<<< HEAD
// Job Tracker landing: Insights (headline numbers, weekly applications, how far they got, where things stand).
=======
// Pipeline: what needs you, then every application. The landing page of the tracker (docs/JOBS-UX.md).
>>>>>>> origin/main
export const dynamic = "force-dynamic";

export default async function Jobs() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
<<<<<<< HEAD
  return <InsightsClient />;
=======
  return <PipelineClient />;
>>>>>>> origin/main
}
