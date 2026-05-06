import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/")
  );
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);

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

  if (
    isPublicPath(url.pathname) ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/robots.txt")
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (url.pathname.startsWith("/admin")) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

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

  if (url.pathname.startsWith("/admin")) {
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

  if (!user && (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/console"))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", url.pathname + url.search);
    response = NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
