import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { PipelineClient } from "./pipeline-client";
import { sessionUser } from "@/lib/supabase/session";

// Pipeline: what needs you, then every application. The landing page of the tracker (docs/JOBS-UX.md).
export const dynamic = "force-dynamic";

export default async function Jobs() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <PipelineClient />;
}
