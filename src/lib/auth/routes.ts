// Pure routing rules for auth, kept out of middleware so they can be unit-tested.
export const PROTECTED_PREFIXES = ["/today", "/practice", "/program", "/history", "/settings", "/jobs", "/network", "/chat"];
export const SIGN_IN_PATH = "/sign-in";
export const HOME_AFTER_SIGN_IN = "/today";

export function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Where to send a request, or null to let it through. */
export function redirectFor(pathname: string, signedIn: boolean): string | null {
  if (!signedIn && isProtected(pathname)) return `${SIGN_IN_PATH}?next=${encodeURIComponent(pathname)}`;
  if (signedIn && pathname === SIGN_IN_PATH) return HOME_AFTER_SIGN_IN;
  return null;
}

/** Only allow same-site relative "next" targets, never an absolute URL (open-redirect guard). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return HOME_AFTER_SIGN_IN;
  return next;
}
