import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { TodoClient } from "./todo-client";
import { sessionUser } from "@/lib/supabase/session";

// "Apply yourself": roles the agent could not submit, plus "Add by link" for anything you applied to by hand.
export const dynamic = "force-dynamic";
export default async function Todo() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <TodoClient />;
}
