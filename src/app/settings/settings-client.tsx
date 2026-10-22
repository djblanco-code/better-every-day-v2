"use client";
import { useState, useTransition } from "react";
import { clearKey, saveSettings, testKey, type SettingsView } from "./actions";

export function SettingsClient({ initial }: { initial: SettingsView }) {
  const [s, setS] = useState(initial);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = "h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm";

  const save = () => start(async () => {
    setMsg(null);
    try {
      const r = await saveSettings({ provider: s.provider, model: s.model, company_focus: s.company_focus, default_minutes: s.default_minutes, api_key: key || undefined, program_start: s.program_start });
      if (r.key_hint) setS({ ...s, key_hint: r.key_hint });
      setKey("");
      setMsg("Saved.");
    } catch (e) { setMsg(String((e as Error)?.message ?? e)); }
  });
  const test = () => start(async () => { setMsg("Testing…"); const r = await testKey(); setMsg(r.message); });
  const remove = () => start(async () => { if (!confirm("Remove the saved API key?")) return; await clearKey(); setS({ ...s, key_hint: null }); setMsg("Key removed."); });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6">
      <div className="flex items-end justify-between gap-3">
        <div><a href="/today" className="text-sm text-neutral-600 hover:underline">← Today</a><h1 className="text-3xl font-semibold tracking-tight">Settings</h1></div>
        <span className="text-sm text-neutral-500">{s.email}</span>
      </div>

      <section className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
        <Row label="Provider"><select className={field} value={s.provider} onChange={(e) => setS({ ...s, provider: e.target.value as SettingsView["provider"], model: "" })}><option value="anthropic">Anthropic (Claude)</option><option value="gemini">Google (Gemini)</option></select></Row>
        <Row label="Model"><input className={`${field} w-64`} value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} placeholder={s.provider === "gemini" ? "gemini-2.5-flash" : "claude-sonnet-5-5"} /></Row>
        <Row label="API key" hint="Stored encrypted in Supabase Vault. Never shown again, only sent to the provider you chose.">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${s.key_hint ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{s.key_hint ? `Saved · …${s.key_hint}` : "Not set"}</span>
            <input className={`${field} w-64`} type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste a key to save or replace" />
          </div>
        </Row>
        <Row label="Company focus" hint="The daily LeetCode slot prefers this company's last-30-days list."><select className={field} value={s.company_focus} onChange={(e) => setS({ ...s, company_focus: e.target.value })}><option value="">None</option>{s.companies.map((c) => <option key={c} value={c}>{c}</option>)}</select></Row>
        <Row label="Default timer"><select className={field} value={s.default_minutes} onChange={(e) => setS({ ...s, default_minutes: +e.target.value })}>{[15, 25, 35, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Row>
        <Row label="Program start" hint="Day one of the 26 weeks. Changing it rebuilds today's plan."><input className={field} type="date" value={s.program_start ?? ""} onChange={(e) => setS({ ...s, program_start: e.target.value || null })} /></Row>
        <Row label="Monthly AI budget" hint={`Spent this month: $${(s.spent_cents / 100).toFixed(2)}. Calls stop at the cap.`}><span className="text-sm">${(s.budget_cents / 100).toFixed(2)}</span></Row>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={save} className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">Save</button>
        <button disabled={pending || !s.key_hint} onClick={test} className="h-10 rounded-lg border border-neutral-300 px-4 text-sm hover:bg-neutral-50 disabled:opacity-50">Test the key</button>
        {s.key_hint ? <button disabled={pending} onClick={remove} className="h-10 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">Remove key</button> : null}
        {msg ? <span role="status" aria-live="polite" className="text-sm text-neutral-600">{msg}</span> : null}
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
        <p className="font-medium text-neutral-900">Your data</p>
        <p className="mt-1"><a className="underline" href="/api/account/export">Download everything</a> as JSON. Account deletion lives here too once the owner enables it on this deployment.</p>
      </section>
    </main>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div><p className="text-sm font-medium">{label}</p>{hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}</div>
      <div>{children}</div>
    </div>
  );
}
