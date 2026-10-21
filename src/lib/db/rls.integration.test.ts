// Integration test for Row Level Security on public.users (task 0.6).
// Runs only when SUPABASE_SECRET_KEY is present (never in the browser, never committed): it creates two throwaway
// users with the admin API, signs each in, and proves A cannot read B. Skipped otherwise so `npm test` stays green.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const enabled = !!(url && anon && secret);

describe.skipIf(!enabled)("RLS on public.users", () => {
  // Built lazily: a skipped describe still evaluates its body, and createClient throws without a URL.
  let admin: ReturnType<typeof createClient>;
  const stamp = Date.now();
  const a = { email: `rls-a-${stamp}@example.com`, password: `pw-${stamp}-a!` };
  const b = { email: `rls-b-${stamp}@example.com`, password: `pw-${stamp}-b!` };
  const ids: string[] = [];

  beforeAll(async () => {
    admin = createClient(url!, secret!, { auth: { persistSession: false } });
    for (const u of [a, b]) {
      const { data, error } = await admin.auth.admin.createUser({ ...u, email_confirm: true });
      if (error) throw error;
      ids.push(data.user.id);
    }
  });
  afterAll(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  });

  it("the trigger created a users row for each account", async () => {
    const { data } = await admin.from("users").select("id").in("id", ids);
    expect(data?.length).toBe(2);
  });

  it("user A sees exactly their own row and never B's", async () => {
    const asA = createClient(url!, anon!, { auth: { persistSession: false } });
    const { error: signIn } = await asA.auth.signInWithPassword(a);
    expect(signIn).toBeNull();
    const { data: all } = await asA.from("users").select("id");
    expect(all?.map((r) => r.id)).toEqual([ids[0]]);
    const { data: bRow } = await asA.from("users").select("id").eq("id", ids[1]);
    expect(bRow).toEqual([]);
  });

  it("user A cannot update B's row", async () => {
    const asA = createClient(url!, anon!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword(a);
    const { data } = await asA.from("users").update({ invited: true }).eq("id", ids[1]).select();
    expect(data).toEqual([]);
    const check = (await admin.from("users").select("invited").eq("id", ids[1]).single()).data as { invited: boolean } | null;
    expect(check?.invited).toBe(false);
  });

  it("anonymous requests get nothing", async () => {
    const asAnon = createClient(url!, anon!, { auth: { persistSession: false } });
    const { data, error } = await asAnon.from("users").select("id");
    expect(error ?? null).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
