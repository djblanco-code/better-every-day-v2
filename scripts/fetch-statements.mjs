// 1.2 Problem statements for the LeetCode bank, from the open leetcode-problems dataset
// (https://github.com/prathameshakole/leetcode-problems). Stored per deployment in public.banks under track
// "statement" (item_id = slug, data = { text }), never committed to this repo.
//   node scripts/fetch-statements.mjs            -> upserts via the API (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY)
//   node scripts/fetch-statements.mjs --sql      -> prints upsert SQL for the Supabase SQL editor
// Only slugs present in supabase/seed/recall-leetcode.json are taken (~330 of ~2900).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { unzipSync } from "node:zlib";

const ZIP = "https://github.com/prathameshakole/leetcode-problems/archive/refs/heads/master.zip";
const bank = JSON.parse(readFileSync(new URL("../supabase/seed/recall-leetcode.json", import.meta.url), "utf8"));
const want = new Set(bank.problems.map((p) => p.slug));

// Minimal zip reader (store/deflate entries) so there is no extra dependency.
function* zipEntries(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10), cdOff = buf.readUInt32LE(eocd + 16);
  let p = cdOff;
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28), start = lho + 30 + lnlen + lelen;
    const raw = buf.subarray(start, start + csize);
    yield { name, data: () => (method === 8 ? inflateRaw(raw) : raw) };
    p += 46 + nlen + elen + clen;
  }
}
import { inflateRawSync } from "node:zlib";
const inflateRaw = (b) => inflateRawSync(b);
void unzipSync;

const asList = (v) => (Array.isArray(v) ? v : typeof v === "string" && v.trim().startsWith("[") ? safeEval(v) : []);
function safeEval(s) { try { return JSON.parse(s.replace(/'/g, '"')); } catch { return []; } }

/** Same shaping as v1 statement(): description + examples + constraints, flattened exponents restored. */
function shape(d) {
  let txt = String(d.description ?? d.content ?? "").replace(/ /g, " ").trim();
  txt = txt.replace(/(?:\s*(?:Example \d+:|Constraints:|Follow-?up:?)\s*)+$/, "").trim();
  const parts = [txt];
  asList(d.examples).forEach((e, i) => { const et = typeof e === "object" && e ? String(e.example_text ?? "") : String(e); parts.push(`Example ${i + 1}:\n${et.trim()}`); });
  const cons = asList(d.constraints);
  const sup = (c) => String(c).replace(/(?<![\d.])10(10|[4-9])(?!\d)/g, (_, e) => `10^${e}`);
  if (cons.length) parts.push("Constraints:\n" + cons.map((c) => "- " + sup(c)).join("\n"));
  return parts.filter(Boolean).join("\n\n");
}

const res = await fetch(ZIP, { headers: { "User-Agent": "better-every-day" } });
if (!res.ok) throw new Error("download failed: " + res.status);
const buf = Buffer.from(await res.arrayBuffer());
const rows = [];
for (const e of zipEntries(buf)) {
  if (!e.name.includes("/problems/") || !e.name.endsWith(".json")) continue;
  let d; try { d = JSON.parse(e.data().toString("utf8")); } catch { continue; }
  const slug = d.problem_slug || e.name.split("/").pop().replace(/^\d+-/, "").replace(/\.json$/, "");
  if (!want.has(slug)) continue;
  const text = shape(d);
  if (text.length > 40) rows.push({ track: "statement", item_id: slug, data: { text } });
}
console.error(`matched ${rows.length} of ${want.size} bank problems`);

if (process.argv.includes("--sql")) {
  const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const out = ["begin;"];
  for (const r of rows) out.push(`insert into public.banks (track, item_id, data) values ('statement', ${lit(r.item_id)}, ${lit(JSON.stringify(r.data))}::jsonb) on conflict (track, item_id) do update set data = excluded.data, updated_at = now();`);
  out.push("commit;", "select 'statements: ' || count(*) as r from public.banks where track = 'statement';");
  process.stdout.write(out.join("\n") + "\n");
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, or use --sql."); process.exit(2); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  for (let i = 0; i < rows.length; i += 100) { const { error } = await sb.from("banks").upsert(rows.slice(i, i + 100), { onConflict: "track,item_id" }); if (error) throw error; }
  console.log(`upserted ${rows.length} statements`);
}
