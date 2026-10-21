import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { redirectFor } from "@/lib/auth/routes";

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
  // getUser() validates the JWT with Supabase; getSession() would trust the cookie blindly.
  const { data } = await supabase.auth.getUser();
  const to = redirectFor(request.nextUrl.pathname, !!data.user);
  if (to) return NextResponse.redirect(new URL(to, request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
