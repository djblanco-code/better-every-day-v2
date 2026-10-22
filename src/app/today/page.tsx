import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { TodayClient } from "./today-client";
import { sessionUser } from "@/lib/supabase/session";

// Recall "Today": the fixed daily plan (25 min LeetCode, 25 min rotating track, one reading/homework item),
// minutes toward the hour, readiness. The plan is generated on the client's local date (see actions.ts).
export const dynamic = "force-dynamic";

export default async function Today() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <TodayClient email={data.user.email ?? ""} />;
}
