import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AppNav } from "./app-nav";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { supabaseServer } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/supabase/session";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap", axes: ["opsz", "SOFT"], weight: "variable" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "Better Every Day",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Better" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  title: "Better Every Day",
  description: "One hour a day: interview practice, applications, and the people who can help.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only the env check is guarded: a missing env (first deploy, CI build) must not crash the shell, but Next's own
  // "this route is dynamic" signal thrown by cookies() must propagate, or static pages fail to prerender (Next 16).
  const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const signedIn = hasEnv ? !!(await sessionUser(await supabaseServer())).user : false;
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fraunces.variable} antialiased`}
      >
        <AppNav signedIn={signedIn} />
        <div className="pb-20 md:pb-0">{children}</div>
        <SpeedInsights />
      </body>
    </html>
  );
}
