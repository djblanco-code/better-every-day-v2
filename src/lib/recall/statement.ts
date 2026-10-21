// Problem statement for a session, as safe HTML. Port of v1 statement() + renderDoc().
// LeetCode: the open dataset copy (task 1.2, storage) or our own wording for premium problems; otherwise a link.
// Python / System Design / DSA: the bank prompt. Debugging: symptom + the script in a code block.
import type { BankItem, Track } from "./types";

export interface Statement { html: string; source: "bank" | "premium" | "dataset" | "none"; url?: string }

export function statementFor(track: Track, item: BankItem, premium: Record<string, string>, dataset?: string | null): Statement {
  if (track === "debugging") {
    const txt = `**Symptom.** ${item.symptom ?? ""}\n\n\`\`\`\n${(item.prompt ?? "").trimEnd()}\n\`\`\`\n\nWrite your diagnosis: what you suspect, how you would confirm it, the root cause, the fix, and how you would keep it from coming back.`;
    return { html: renderDoc(txt), source: "bank" };
  }
  if (track !== "leetcode") return { html: renderDoc(item.prompt ?? ""), source: "bank" };
  if (dataset) return { html: renderDoc(dataset), source: "dataset", url: item.url };
  const prem = premium[item.id];
  if (prem) return { html: renderDoc(prem), source: "premium", url: item.url };
  return { html: "", source: "none", url: item.url };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Tiny markdown subset: headings, bold, inline code, fenced code, bullet lists, Example/Constraints labels, paragraphs. */
export function renderDoc(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  let out = "", inCode = false, inList = false;
  const inline = (s: string) =>
    esc(s).replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1">$1</code>').replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\^(\d+)/g, "<sup>$1</sup>");
  const closeList = () => { if (inList) { out += "</ul>"; inList = false; } };
  for (const l of lines) {
    if (l.startsWith("```")) { closeList(); inCode = !inCode; out += inCode ? '<pre class="my-3 overflow-x-auto rounded-lg bg-neutral-100 p-3 font-mono text-[13px] leading-6">' : "</pre>"; continue; }
    if (inCode) { out += esc(l) + "\n"; continue; }
    const m = l.match(/^(#{1,4})\s+(.*)/);
    if (m) { closeList(); out += `<h3 class="mb-1 mt-5 font-semibold">${inline(m[2])}</h3>`; continue; }
    if (/^\s*[-*]\s+/.test(l)) { if (!inList) { out += '<ul class="my-2 list-disc pl-6">'; inList = true; } out += `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`; continue; }
    closeList();
    if (/^(Example \d+:|Constraints:|Follow[- ]up:?)/i.test(l)) { out += `<p class="mb-1 mt-5 font-semibold">${inline(l)}</p>`; continue; }
    if (/^(Input:|Output:|Explanation:)/.test(l)) { out += `<p class="my-0.5 font-mono text-[13px] text-neutral-600">${inline(l)}</p>`; continue; }
    if (l.trim() === "") continue;
    out += `<p class="my-2">${inline(l)}</p>`;
  }
  closeList();
  if (inCode) out += "</pre>";
  return out;
}
