import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/terms"] as const;

const PUBLIC_PREFIXES = ["/auth", "/api/auth", "/_next", "/favicon", "/robots.txt"] as const;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/console",
  "/playground",
  "/api-keys",
  "/usage",
  "/billing",
  "/credits",
  "/settings",
  "/admin",
] as const;

function getSafeNextPath(next: string | null) {
  if (!next) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//")) return "/dashboard";
  return next;
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);

  // Canonicalize production domain: www.tokfai.com -> tokfai.com
  // This prevents cookie/session splitting across apex vs www.
  if (url.hostname === "www.tokfai.com") {
    const canonical = new URL(request.url);
    canonical.hostname = "tokfai.com";
    return NextResponse.redirect(canonical, 308);
  }

  if (url.pathname === "/debug/connectivity") {
    const connectivityPageEnabled =
      process.env.NEXT_PUBLIC_ENABLE_CONNECTIVITY_PAGE === "true" ||
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_ENABLE_DEBUG_PAGES === "true";
    if (!connectivityPageEnabled) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/debug")) {
    const debugAllowed =
      process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEBUG_PAGES === "true";
    if (!debugAllowed) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

  // Public paths always pass through (no auth required).
  // Exception: if already logged in, visiting /login will redirect to next or /dashboard.
  if (isPublicPath(url.pathname)) {
    if (url.pathname === "/login" && supabaseUrl && supabaseAnonKey) {
      let response = NextResponse.next({ request });
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          }
        }
      });
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        const next = getSafeNextPath(url.searchParams.get("next"));
        return NextResponse.redirect(new URL(next, url.origin));
      }
    }
    return NextResponse.next();
  }

  // Non-public but also non-protected paths: don't enforce login here.
  if (!isProtectedPath(url.pathname)) {
    return NextResponse.next();
  }

  // Protected paths require Supabase env; if missing, fail closed for /admin, otherwise pass through.
  if (!hasSupabaseEnv) {
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", url.pathname + url.search);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", url.pathname + url.search);
    response = NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
