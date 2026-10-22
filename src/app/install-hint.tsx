"use client";
import { useEffect, useState } from "react";

// One-line "install it" nudge on phones, shown only in a browser tab (never once the app runs standalone), and only
// after the second visit so the first impression is the product, not a banner. iPhone has no install prompt API, so
// the copy says where the button is; Chrome/Edge get the real prompt via beforeinstallprompt.
type BIP = Event & { prompt: () => Promise<void> };
export function InstallHint() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [bip, setBip] = useState<BIP | null>(null);
  useEffect(() => {
    try {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      const phone = window.matchMedia("(max-width: 767px)").matches;
      const visits = Number(localStorage.getItem("visits") ?? "0") + 1;
      localStorage.setItem("visits", String(visits));
      if (standalone || !phone || visits < 2 || localStorage.getItem("install.dismissed")) return;
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setShow(true);
      const on = (e: Event) => { e.preventDefault(); setBip(e as BIP); };
      window.addEventListener("beforeinstallprompt", on);
      return () => window.removeEventListener("beforeinstallprompt", on);
    } catch { /* private mode: no hint */ }
  }, []);
  if (!show) return null;
  const dismiss = () => { try { localStorage.setItem("install.dismissed", "1"); } catch {} setShow(false); };
  return (
    <div role="note" className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm">
      <span className="flex-1">{ios ? "Add this to your Home Screen: tap Share, then “Add to Home Screen”." : "Install this as an app for a full-screen, faster experience."}</span>
      {bip ? <button className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white" onClick={() => bip.prompt().finally(dismiss)}>Install</button> : null}
      <button aria-label="Dismiss" className="btn-icon px-1 text-neutral-500" onClick={dismiss}>✕</button>
    </div>
  );
}
