import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { ProgramClient } from "./program-client";

// 26 weeks: readings and homework per week, mastery by category, readiness over time, adherence.
export const dynamic = "force-dynamic";

export default async function Program() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(SIGN_IN_PATH);
  return <ProgramClient />;
}
