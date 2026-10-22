"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { applySuggestion, checkMail, dismissSuggestion, getMail, type MailState } from "./actions";
import { STAGE_LABEL, type Stage } from "@/lib/jobs/types";
import { btn, btnGhost, Card, JobsNav, localDate, Shell } from "../ui";

const KIND: Record<string, { label: string; tone: string; stage: Stage | null }> = {
  interview: { label: "interview", tone: "bg-blue-50 text-blue-700", stage: "interview" },
  assessment: { label: "assessment", tone: "bg-amber-50 text-amber-700", stage: null },
  rejection: { label: "rejection", tone: "bg-red-50 text-red-700", stage: "rejected" },
  offer: { label: "offer", tone: "bg-green-50 text-green-700", stage: "offer" },
  other: { label: "mentions a company", tone: "bg-neutral-100 text-neutral-700", stage: null },
};

export function MailClient() {
  const [M, setM] = useState<MailState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => getMail().then(setM).catch((e) => setMsg(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  const run = async (key: string, p: Promise<unknown>) => { setBusy(key); try { await p; await load(); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(null); } };
  if (!M) return <Shell><JobsNav active="mail" /><p className="text-neutral-500">Loading…</p></Shell>;
  const configured = !!(M.address && M.hint);
  return (
    <Shell>
      <JobsNav active="mail" />
      <Card title="Mail" sub="Reads your Gmail inbox for the last two weeks, keeps only messages that mention a company in your tracker or look like an invite, assessment, rejection or offer, and proposes a change. You confirm each one. Nothing is sent.">
        {configured ? (
          <div className="flex flex-wrap items-center gap-3">
            <button className={btn} disabled={busy === "check"} onClick={() => run("check", checkMail(14).then((r) => setMsg(`Looked at the inbox: ${r.found} relevant message${r.found === 1 ? "" : "s"}, ${r.added} new.`)))}>{busy === "check" ? "Checking…" : "Check mail now"}</button>
            <span className="text-sm text-neutral-500">{M.address} · app password …{M.hint}{M.last_checked_at ? ` · last checked ${new Date(M.last_checked_at).toLocaleString()}` : ""}</span>
            <Link href="/settings" className="text-sm text-neutral-600 hover:underline">Change in Settings</Link>
          </div>
        ) : <p className="text-sm text-neutral-600">Not set up. In <Link href="/settings" className="underline">Settings</Link>, add your Gmail address and a Google app password (Google Account → Security → 2-Step Verification → App passwords). It is stored encrypted, like your AI key, and only used to read.</p>}
        {msg ? <p role="status" aria-live="polite" className="mt-3 text-sm text-neutral-700">{msg}</p> : null}
      </Card>
      <Card title={`Suggestions · ${M.suggestions.length}`} sub="Newest first. Apply sets the stage on the matched application; Dismiss hides the message.">
        {M.suggestions.length ? <ul className="divide-y divide-neutral-100">{M.suggestions.map((s) => { const k = KIND[s.kind] ?? KIND.other; return (
          <li key={s.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs ${k.tone}`}>{k.label}</span>{s.company ? <span className="text-sm font-medium">{s.company}</span> : <span className="text-sm text-neutral-500">no match in the tracker</span>}<span className="text-xs text-neutral-400">{new Date(s.received_at).toLocaleDateString()}</span></div>
            <p className="mt-1 text-sm"><span className="font-medium">{s.subject || "(no subject)"}</span> <span className="text-neutral-500">· {s.from_name || s.from_addr}</span></p>
            {s.snippet ? <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{s.snippet}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {s.app_id && k.stage ? <button className={btn} disabled={busy === s.id} onClick={() => run(s.id, applySuggestion(s.id, k.stage, s.app_id, localDate()))}>Set stage: {STAGE_LABEL[k.stage]}</button> : null}
              {s.app_id && s.kind === "assessment" ? <Link href="/jobs/action" className={btnGhost}>Add the assessment</Link> : null}
              {s.app_id ? <button className={btnGhost} disabled={busy === s.id} onClick={() => run(s.id, applySuggestion(s.id, null, s.app_id, localDate()))}>Noted, no change</button> : null}
              <button className="text-sm text-neutral-500 hover:underline" disabled={busy === s.id} onClick={() => run(s.id, dismissSuggestion(s.id))}>Dismiss</button>
            </div>
          </li>); })}</ul> : <p className="py-6 text-center text-sm text-neutral-500">{configured ? "Nothing new. Check mail to look again." : "Set up mail above to see suggestions here."}</p>}
      </Card>
    </Shell>
  );
}
