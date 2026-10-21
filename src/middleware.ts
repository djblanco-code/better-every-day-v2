import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { isProtected, INVITE_PATH, SIGN_IN_PATH, redirectFor } from "@/lib/auth/routes";

// Refreshes the Supabase session cookie on every request and applies the routing rules in lib/auth/routes.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let env: ReturnType<typeof publicEnv>;
  try {
    env = publicEnv();
  } catch {
    // Unconfigured deployment (no NEXT_PUBLIC_* vars): let the request through so the hello page can say so,
    // instead of turning every route into a 500 MIDDLEWARE_INVOCATION_FAILED.
    return response;
  }
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // An OAuth code that lands anywhere but the callback (Supabase falls back to the Site URL when the
  // redirect is not on its allow list) is forwarded to the callback so the session still gets created.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const to = new URL("/auth/callback", request.url);
    to.searchParams.set("code", code);
    to.searchParams.set("next", request.nextUrl.searchParams.get("next") ?? "/today");
    return NextResponse.redirect(to);
  }
  // getUser() validates the JWT with Supabase; getSession() would trust the cookie blindly.
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // The invite flag is only read on pages the gate applies to: one indexed row, under RLS.
  let invited = true;
  if (data.user && (isProtected(path) || path === INVITE_PATH || path === SIGN_IN_PATH)) {
    const { data: row } = await supabase.from("users").select("invited").eq("id", data.user.id).maybeSingle();
    invited = row?.invited === true;
  }
  const to = redirectFor(path, { signedIn: !!data.user, invited });
  if (to) return NextResponse.redirect(new URL(to, request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
