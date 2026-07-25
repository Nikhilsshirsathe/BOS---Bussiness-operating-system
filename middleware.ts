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

  // ── Public routes ──────────────────────────────────────────────
  const publicRoutes = ["/", "/login", "/signup", "/register", "/auth/callback", "/user-login", "/user-signup"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicPage  = pathname.startsWith("/b/");
  const isAPIRoute    = pathname.startsWith("/api/");
  const isAsset       = pathname.startsWith("/_next/") || pathname.startsWith("/favicon");

  if (isPublicPage || isAPIRoute || isAsset) return supabaseResponse;

  // ── Auth pages: redirect logged-in users by role ───────────────
  const isAuthPage = ["/login", "/signup", "/user-login", "/user-signup", "/register"].includes(pathname);

  if (user && isAuthPage) {
    const role = user.user_metadata?.role ?? "business";
    const url  = request.nextUrl.clone();
    url.pathname = role === "user" ? "/explore" : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isPublicRoute) return supabaseResponse;

  // ── Protected: dashboard routes (business owners only) ─────────
  const dashboardPrefixes = [
    "/dashboard", "/chatbot", "/voice-agent", "/appointment",
    "/knowledge", "/share", "/settings", "/onboarding",
    "/analytics", "/conversations", "/voice-calls", "/appointments",
    "/leads", "/services", "/ai-settings", "/qr-code", "/agents",
    "/profile-setup",
  ];
  const needsDashboard = dashboardPrefixes.some((p) => pathname.startsWith(p));

  if (needsDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Protected: explore (users) ─────────────────────────────────
  if (pathname.startsWith("/explore") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/user-login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
