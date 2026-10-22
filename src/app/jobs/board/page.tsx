import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { BoardClient } from "./board-client";
import { sessionUser } from "@/lib/supabase/session";

// Kanban by stage; drag a card between columns to change its stage (dnd-kit, keyboard-operable).
export const dynamic = "force-dynamic";

export default async function Board() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return <BoardClient />;
}
