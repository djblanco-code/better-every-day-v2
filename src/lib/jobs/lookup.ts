import "server-only";
// Auto-fill a posting from its URL (port of v1 lookup()): Greenhouse, Ashby and Lever public APIs, then JobPosting
// JSON-LD, then og:title. Page content is data: only structured fields are read, nothing is executed.

export interface Lookup { url: string; company: string; role: string; location: string; pay: string; summary: string; error?: string }

const UA = { "User-Agent": "Mozilla/5.0 Chrome/128" };
async function get(url: string): Promise<string> {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function payIn(text: string): string {
  const t = strip(text ?? "");
  const m = t.match(/\$\s?(\d{2,3}(?:,\d{3})?)\s?[kK]?\s*(?:-|–|—|to)\s*\$?\s?(\d{2,3}(?:,\d{3})?)\s?[kK]?/);
  if (!m) return "";
  const f = (x: string) => { const n = Number(x.replace(/,/g, "")); return n <= 999 ? n * 1000 : n; };
  return `$${Math.floor(f(m[1]) / 1000)}K-$${Math.floor(f(m[2]) / 1000)}K`;
}

export async function lookup(raw: string): Promise<Lookup> {
  const u = raw.trim();
  const info: Lookup = { url: u, company: "", role: "", location: "", pay: "", summary: "" };
  let host = "";
  try { host = new URL(u).host.toLowerCase(); } catch { return { ...info, error: "Not a valid URL" }; }
  try {
    const gh = u.match(/greenhouse\.io\/(?:embed\/job_app\?for=([^&]+)|([^/]+)\/jobs\/(\d+))/);
    const q = new URL(u).searchParams;
    const board = (gh && (gh[1] || gh[2])) || q.get("for") || q.get("gh_board");
    const jid = (gh && gh[3]) || q.get("gh_jid") || q.get("token");
    if (board && jid) {
      const j = JSON.parse(await get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jid}`));
      const content = strip(strip(j.content ?? ""));
      return { ...info, url: j.absolute_url || u, company: j.company_name || board, role: j.title || "", location: j.location?.name || "", pay: payIn(content), summary: squash(content).slice(0, 500) };
    }
    const ab = u.match(/jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{36})/);
    if (ab) {
      const d = JSON.parse(await get(`https://api.ashbyhq.com/posting-api/job-board/${ab[1]}?includeCompensation=true`));
      const j = (d.jobs ?? []).find((x: { id: string }) => x.id === ab[2]);
      if (j) { const comp = j.compensation?.compensationTierSummary ?? ""; return { ...info, company: decodeURIComponent(ab[1]), role: j.title ?? "", location: j.location ?? "", pay: payIn(comp) || comp, summary: (j.descriptionPlain ?? "").slice(0, 500) }; }
    }
    const lv = u.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/);
    if (lv) {
      const j = JSON.parse(await get(`https://api.lever.co/v0/postings/${lv[1]}/${lv[2]}`));
      return { ...info, company: lv[1], role: j.text ?? "", location: j.categories?.location ?? "", pay: payIn(j.descriptionPlain ?? ""), summary: (j.descriptionPlain ?? "").slice(0, 500) };
    }
  } catch { /* fall through to the page itself */ }
  try {
    const page = await get(u);
    for (const blk of page.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
      let d: unknown; try { d = JSON.parse(blk[1]); } catch { continue; }
      const list = Array.isArray(d) ? d : ((d as { "@graph"?: unknown[] })["@graph"] ?? [d]);
      for (const j of list as Array<Record<string, unknown>>) {
        if (j?.["@type"] !== "JobPosting") continue;
        let loc = j.jobLocation as Record<string, unknown> | Record<string, unknown>[] | undefined; if (Array.isArray(loc)) loc = loc[0];
        const addr = ((loc as Record<string, unknown>)?.address ?? {}) as Record<string, string>;
        const sal = ((j.baseSalary as Record<string, unknown>)?.value ?? {}) as Record<string, number>;
        const pay = sal.minValue && sal.maxValue ? `$${Math.floor(sal.minValue / 1000)}K-$${Math.floor(sal.maxValue / 1000)}K` : payIn(String(j.description ?? ""));
        return { ...info, company: (j.hiringOrganization as Record<string, string>)?.name ?? "", role: String(j.title ?? ""), location: [addr.addressLocality, addr.addressRegion].filter(Boolean).join(", ") || (j.jobLocationType ? "Remote" : ""), pay, summary: squash(strip(String(j.description ?? ""))).slice(0, 500) };
      }
    }
    const t = page.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) ?? page.match(/<title>(.*?)<\/title>/s);
    const title = t ? squash(strip(t[1])) : "";
    const site = page.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/);
    const parts = title.split(/\s+[|–—@-]\s+/);
    return { ...info, role: (parts[0] ?? "").slice(0, 100), company: site ? strip(site[1]) : parts[1] ?? host.replace(/^www\./, ""), pay: payIn(page.slice(0, 200000)) };
  } catch (e) {
    return { ...info, error: String((e as Error)?.message ?? e).slice(0, 120) };
  }
}
