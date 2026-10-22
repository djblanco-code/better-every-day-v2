import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { NetworkClient } from "./network-client";
import { sessionUser } from "@/lib/supabase/session";

// Network: people you met, mentors, recruiters, events, who can connect you to what, and follow-ups.
export const dynamic = "force-dynamic";
export default async function Network() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <NetworkClient />;
}
