import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { sessionUser } from "@/lib/supabase/session";
import { GoalsClient } from "./goals-client";

// Goals: the once questionnaire (five minutes) and the list it produces. The daily plan picks from these.
export const dynamic = "force-dynamic";

export default async function Goals() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <GoalsClient />;
}
