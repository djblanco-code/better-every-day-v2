import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// Reads the last N days of the user's inbox over IMAP (Gmail app password) and proposes tracker changes.
// Deterministic: keyword rules, no model call. The app password comes from the Vault via read_mail_secret()
// and is held in memory for the length of one check only. docs/JOBS-UX.md §4 has the rules.
export type Kind = "interview" | "assessment" | "rejection" | "offer" | "other";
export interface Candidate { id: string; company: string }
export interface Suggestion { id: string; received_at: string; from_addr: string; from_name: string; subject: string; snippet: string; kind: Kind; app_id: string | null; company: string }

const RULES: [Kind, RegExp][] = [
  ["offer", /offer letter|pleased to offer|extend (you )?an offer|formal offer/i],
  ["rejection", /unfortunately|not (be )?moving forward|other candidates|will not be proceeding|decided not to|not selected|no longer under consideration/i],
  ["assessment", /assessment|hackerrank|codesignal|take-?home|coding challenge|online test|karat/i],
  ["interview", /interview|phone screen|schedule a call|your availability|technical screen|next steps? with|chat with (our|the) team/i],
];
const NOISE = /noreply@(linkedin|indeed|glassdoor)|jobalerts|job-alerts|newsletter|unsubscribe from these/i;

export function classify(subject: string, body: string): Kind {
  const t = `${subject}\n${body.slice(0, 2000)}`;
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return "other";
}

/** Company match: a tracker company name (first word of 4+ letters, or the whole name) found in sender or subject. */
export function matchCompany(cands: Candidate[], fromAddr: string, fromName: string, subject: string): Candidate | null {
  const hay = `${fromAddr} ${fromName} ${subject}`.toLowerCase();
  let best: Candidate | null = null, bestLen = 0;
  for (const c of cands) {
    const name = c.company.toLowerCase().trim();
    if (!name) continue;
    const key = name.length >= 4 ? name : "";
    const compact = name.replace(/[^a-z0-9]+/g, "");          // "acme robotics" -> "acmerobotics" (sender domains)
    const first = name.split(/[^a-z0-9]+/).find((w) => w.length >= 4) ?? "";
    for (const needle of [key, compact.length >= 4 ? compact : "", first]) {
      if (needle && hay.includes(needle) && needle.length > bestLen) { best = c; bestLen = needle.length; }
    }
  }
  return best;
}

export async function checkInbox(opts: { address: string; password: string; days: number; candidates: Candidate[]; limit?: number }): Promise<Suggestion[]> {
  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: opts.address, pass: opts.password }, logger: false, socketTimeout: 20_000 });
  const since = new Date(Date.now() - opts.days * 86400000);
  const out: Suggestion[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ since }, { uid: true })) || [];
      const pick = uids.slice(-(opts.limit ?? 60));
      for await (const msg of client.fetch(pick, { uid: true, envelope: true, source: { maxLength: 60_000 } } as never, { uid: true })) {
        const env = msg.envelope;
        const from = env?.from?.[0];
        const fromAddr = from?.address ?? "", fromName = from?.name ?? "", subject = env?.subject ?? "";
        if (NOISE.test(`${fromAddr} ${subject}`)) continue;
        let body = "";
        try { const parsed = await simpleParser(msg.source as Buffer); body = (parsed.text ?? "").trim(); } catch { body = ""; }
        const hit = matchCompany(opts.candidates, fromAddr, fromName, subject);
        const kind = classify(subject, body);
        if (!hit && kind === "other") continue;   // unrelated mail never leaves the mailbox
        out.push({
          id: (env?.messageId ?? `uid-${msg.uid}`).slice(0, 200), received_at: new Date(env?.date ?? Date.now()).toISOString(),
          from_addr: fromAddr.slice(0, 200), from_name: fromName.slice(0, 120), subject: subject.slice(0, 200), snippet: body.replace(/\s+/g, " ").slice(0, 240),
          kind, app_id: hit?.id ?? null, company: hit?.company ?? "",
        });
      }
    } finally { lock.release(); }
  } finally { await client.logout().catch(() => undefined); }
  return out.sort((a, b) => b.received_at.localeCompare(a.received_at));
}
