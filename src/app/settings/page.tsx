import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getSettings } from "./actions";
import { SettingsClient } from "./settings-client";

// Bring-your-own key (Supabase Vault), provider/model, company focus, timer default, program start, budget.
export const dynamic = "force-dynamic";

export default async function Settings() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(SIGN_IN_PATH);
  const s = await getSettings();
  return <SettingsClient initial={s} />;
}
