"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { HOME_AFTER_SIGN_IN } from "@/lib/auth/routes";

export type InviteState = { error: string | null };

export async function acceptInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const code = String(form.get("code") ?? "").trim();
  if (!code) return { error: "Enter the code." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("accept_invite", { code });
  if (error) return { error: "Could not check the code right now. Try again in a moment." };
  if (data !== true) return { error: "That code is not right. Ask the person who invited you." };
  redirect(HOME_AFTER_SIGN_IN);
}
