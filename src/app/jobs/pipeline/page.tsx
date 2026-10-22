import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { sessionUser } from "@/lib/supabase/session";
import { PipelineClient } from "../pipeline-client";

// Pipeline: what needs you, what went quiet, then every application (docs/JOBS-UX.md).
export const dynamic = "force-dynamic";

export default async function Pipeline() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <PipelineClient />;
}
