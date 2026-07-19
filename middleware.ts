import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // ── Public routes (no auth required) ──────────────────────────
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/register",
    "/auth/callback",
  ];

  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicPage  = pathname.startsWith("/b/");       // /b/[slug]
  const isAPIRoute    = pathname.startsWith("/api/");
  const isAsset       = pathname.startsWith("/_next/") || pathname.startsWith("/favicon");

  // Allow public pages and APIs without auth
  if (isPublicPage || isAPIRoute || isAsset || isPublicRoute) {
    return supabaseResponse;
  }

  // ── Dashboard routes require auth ─────────────────────────────
  const protectedPrefixes = [
    "/dashboard", "/chatbot", "/voice-agent", "/appointment",
    "/knowledge", "/share", "/settings", "/onboarding",
  ];

  const needsAuth = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
