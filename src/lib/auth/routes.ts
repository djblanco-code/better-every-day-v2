// Pure routing rules for auth, kept out of middleware so they can be unit-tested.
export const PROTECTED_PREFIXES = ["/today", "/practice", "/program", "/history", "/settings", "/jobs", "/network", "/life", "/chat"];
export const SIGN_IN_PATH = "/sign-in";
export const INVITE_PATH = "/invite";
export const HOME_AFTER_SIGN_IN = "/today";

export function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export type Visitor = { signedIn: boolean; invited: boolean };

/** Where to send a request, or null to let it through. */
export function redirectFor(pathname: string, v: boolean | Visitor): string | null {
  const { signedIn, invited } = typeof v === "boolean" ? { signedIn: v, invited: true } : v;
  if (!signedIn && (isProtected(pathname) || pathname === INVITE_PATH)) return `${SIGN_IN_PATH}?next=${encodeURIComponent(pathname)}`;
  if (signedIn && !invited && isProtected(pathname)) return INVITE_PATH;
  if (signedIn && invited && pathname === INVITE_PATH) return HOME_AFTER_SIGN_IN;
  if (signedIn && pathname === SIGN_IN_PATH) return invited ? HOME_AFTER_SIGN_IN : INVITE_PATH;
  return null;
}

/** Only allow same-site relative "next" targets, never an absolute URL (open-redirect guard). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return HOME_AFTER_SIGN_IN;
  return next;
}
