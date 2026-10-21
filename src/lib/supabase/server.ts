import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

// Server-side client for Server Components, Route Handlers and Server Actions.
// Still the publishable key: RLS decides what this user may read. The secret key is never used here.
export async function supabaseServer() {
  const store = await cookies();   // first: touching cookies marks the route dynamic, so env is read at request time
  const env = publicEnv();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; middleware refreshes the session instead.
        }
      },
    },
  });
}
