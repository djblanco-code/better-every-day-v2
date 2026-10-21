// Public (client-safe) environment. Server-only secrets never go through this file.
import { z } from "zod";

const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
});

// Next.js inlines NEXT_PUBLIC_* into client bundles only when each one is written out as a literal
// `process.env.NAME` expression. Indexing a `process.env` object does not get inlined (it is undefined in the
// browser), so the defaults below must stay spelled out. `source` exists for tests.
export function publicEnv(source?: Record<string, string | undefined>) {
  return PublicEnv.parse(
    source ?? {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  );
}
