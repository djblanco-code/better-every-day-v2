import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { sessionUser } from "@/lib/supabase/session";
import { LifeClient } from "./life-client";

// Life: habits, the daily check-in, and money for the month.
export const dynamic = "force-dynamic";

export default async function Life() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <LifeClient />;
}
