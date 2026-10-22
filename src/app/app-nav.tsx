"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// One navigation for every signed-in page: a top bar on wide screens, a thumb-reachable bottom tab bar on phones
// (44px+ targets, safe-area padding for the iPhone home indicator). Hidden on sign-in, invite and the landing page.
const TABS: { href: string; label: string; icon: string; match: (p: string) => boolean; desktopOnly?: boolean }[] = [
  { href: "/", label: "Home", icon: "⌂", match: (p) => p === "/" || p.startsWith("/today") || p.startsWith("/practice") || p.startsWith("/history") || p.startsWith("/program") || p.startsWith("/goals") },
  { href: "/jobs", label: "Jobs", icon: "▤", match: (p) => p.startsWith("/jobs") },
  { href: "/network", label: "Network", icon: "⚭", match: (p) => p.startsWith("/network") },
  { href: "/life", label: "Life", icon: "☀", match: (p) => p.startsWith("/life") },
  { href: "/settings", label: "Settings", icon: "⚙", match: (p) => p.startsWith("/settings") },
];
const HIDE = ["/sign-in", "/invite", "/auth"];

export function AppNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname() ?? "/";
  if (!signedIn || HIDE.some((h) => path.startsWith(h))) return null;
  return (
    <>
      <nav aria-label="Primary" className="sticky top-0 z-40 hidden h-12 items-center gap-1 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur md:flex">
        <Link href="/" className="mr-3 text-sm font-semibold">Better Every Day</Link>
        {TABS.map((t) => <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm ${t.match(path) ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>{t.label}</Link>)}
      </nav>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid grid-cols-5">
          {TABS.filter((t) => !t.desktopOnly).map((t) => <li key={t.href}><Link href={t.href} aria-current={t.match(path) ? "page" : undefined} className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${t.match(path) ? "text-neutral-900 font-semibold" : "text-neutral-500"}`}><span aria-hidden className="text-lg leading-none">{t.icon}</span>{t.label}</Link></li>)}
        </ul>
      </nav>
    </>
  );
}
