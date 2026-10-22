import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { AllClient } from "./all-client";
import { sessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export default async function All() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <AllClient />;
}
