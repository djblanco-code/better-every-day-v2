// Integration test for Row Level Security on public.users (task 0.6).
// Runs only when SUPABASE_SECRET_KEY is present: in CI against a throwaway local Supabase (job "rls" in ci.yml), or
// locally against your own project if you export the secret for one shell. It creates two throwaway
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

  it("a data table (applications) and the jobs RPC are isolated the same way", async () => {
    // Service role bypasses RLS: plant one application for A.
    const row = { user_id: ids[0], id: `app-${stamp}`, company: "Acme", role: "SWE", applied_on: "2026-01-01", stage: "applied", kind: "applied" };
    const { error: ins } = await admin.from("applications").insert(row as never);
    expect(ins).toBeNull();
    const asB = createClient(url!, anon!, { auth: { persistSession: false } });
    await asB.auth.signInWithPassword(b);
    expect((await asB.from("applications").select("id")).data).toEqual([]);
    const viaB = (await asB.rpc("get_jobs_state")).data as { applications: unknown[] } | null;
    expect(viaB?.applications).toEqual([]);
    const asA = createClient(url!, anon!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword(a);
    expect((await asA.from("applications").select("id")).data).toEqual([{ id: row.id }]);
    const viaA = (await asA.rpc("get_jobs_state")).data as { applications: { id: string }[] } | null;
    expect(viaA?.applications.map((x) => x.id)).toEqual([row.id]);
  });

  it("anonymous requests get nothing", async () => {
    const asAnon = createClient(url!, anon!, { auth: { persistSession: false } });
    const { data, error } = await asAnon.from("users").select("id");
    expect(error ?? null).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
