"use client";
import { useEffect, useState } from "react";
import { clearMail, getMail, saveMail } from "../jobs/mail/actions";

// Gmail for the Job Tracker: address + Google app password, stored in the Vault like the AI key. Read-only use.
const field = "h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm";
export function MailSettings() {
  const [address, setAddress] = useState("");
  const [pw, setPw] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getMail().then((m) => { setAddress(m.address); setHint(m.hint); }).catch(() => undefined); }, []);
  const save = async () => { setBusy(true); setMsg(null); try { const r = await saveMail(address, pw); setHint(r.hint); setPw(""); setMsg("Saved. Check mail from the Job Tracker's Mail tab."); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await clearMail(); setHint(null); setMsg("Removed."); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(false); } };
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="font-medium">Gmail for the Job Tracker</h2>
      <p className="mt-1 text-sm text-neutral-500">The Mail tab reads your inbox for interview invites, assessments, rejections and offers and proposes changes you confirm. Needs a Google <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">app password</a> (2-Step Verification must be on). Stored encrypted in Supabase Vault; never shown again; only used to read.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={field} placeholder="you@gmail.com" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
        <input className={field} type="password" placeholder={hint ? `Saved · …${hint} (paste to replace)` : "App password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <div className="flex gap-2"><button disabled={busy || !address || !pw} onClick={save} className="h-9 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">Save</button>{hint ? <button disabled={busy} onClick={remove} className="h-9 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">Remove</button> : null}</div>
      </div>
      {msg ? <p role="status" aria-live="polite" className="mt-2 text-sm text-neutral-600">{msg}</p> : null}
    </section>
  );
}
