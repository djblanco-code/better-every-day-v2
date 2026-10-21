"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/routes";

type Provider = "google" | "github";
const LABEL: Record<Provider, string> = { google: "Continue with Google", github: "Continue with GitHub" };

export function SignInButtons({ next }: { next?: string }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(provider: Provider) {
    setBusy(provider);
    setErr(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setErr(error.message);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(["google", "github"] as Provider[]).map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          disabled={busy !== null}
          className="h-11 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {busy === p ? "Redirecting…" : LABEL[p]}
        </button>
      ))}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
