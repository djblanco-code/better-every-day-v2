import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { sessionUser } from "@/lib/supabase/session";
import { MailClient } from "./mail-client";

// Mail: suggestions from the inbox (interview invites, assessments, rejections, offers) matched to applications.
export const dynamic = "force-dynamic";
export const maxDuration = 60;   // one IMAP pass over the last two weeks can take a while on a busy inbox

export default async function Mail() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <MailClient />;
}
