import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { ActionClient } from "./action-client";
import { sessionUser } from "@/lib/supabase/session";

// Action needed: assessments to do and intro calls to set up (assessments are not interviews).
export const dynamic = "force-dynamic";
export default async function ActionNeeded() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <ActionClient />;
}
