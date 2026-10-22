import type { SupabaseClient } from "@supabase/supabase-js";

// Who is signed in, verified locally. `getClaims()` checks the JWT signature against the project's public key
// (asymmetric ECC P-256 keys, see Supabase > JWT Keys) and never calls the Auth server on the hot path; `getUser()`
// did one network round trip per page and per action. Revocation still lands within the token lifetime (1 h); the
// only place that must catch it immediately, account deletion, keeps `getUser()`. No next/headers import here so
// the proxy (edge) can use it too.
export type SessionUser = { id: string; email: string | null };

export async function sessionUser(supabase: SupabaseClient): Promise<{ user: SessionUser | null }> {
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return { user: null };
  return { user: { id: c.sub, email: typeof c.email === "string" ? c.email : null } };
}
