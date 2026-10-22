import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { InviteForm } from "./form";
import { sessionUser } from "@/lib/supabase/session";

// Signed in but not yet invited. The code is checked inside Postgres (accept_invite, security definer), so
// neither this page nor the browser can flip the flag on its own.
export default async function Invite() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) redirect(SIGN_IN_PATH);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Invite only</h1>
        <p className="mt-1 text-neutral-600">
          You are signed in as <span className="font-medium text-neutral-900">{data.user.email}</span>, but this app is
          invite-only for now. Enter the code you were given.
        </p>
      </div>
      <InviteForm />
      <form action="/auth/sign-out" method="post">
        <button className="text-sm text-neutral-500 underline-offset-2 hover:underline">Sign out</button>
      </form>
    </main>
  );
}
