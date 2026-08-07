import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run logic between createServerClient and getUser() - it refreshes
  // the auth token and must run on every request for sessions to stay valid.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // API routes handle their own auth (e.g. the cron endpoints check
  // CRON_SECRET) - they're never invoked with a browser session, so the
  // page-level redirect logic below doesn't apply to them.
  if (path.startsWith("/api/")) {
    return supabaseResponse;
  }

  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");
  const isLandingPage = path === "/";
  const isPublicPage =
    isAuthPage || isLandingPage || path === "/contact" || path.startsWith("/demo");
  const isAdminPage = path.startsWith("/admin");

  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged-in visitors don't need the marketing page or the login/register
  // forms - send them straight to their dashboard.
  if (user && (isAuthPage || isLandingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isAdminPage && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
