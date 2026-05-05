import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextFromQuery = url.searchParams.get("next");
  const state = url.searchParams.get("state");
  const origin = url.origin;

  // Provider / Supabase may redirect back with error params (no code)
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (errorParam) {
    console.error("Auth callback provider error:", {
      error: errorParam,
      error_description: errorDescription,
      href: url.toString(),
    });
    const redirect = new URL("/login", origin);
    redirect.searchParams.set("error", String(errorParam));
    if (errorDescription) redirect.searchParams.set("error_description", String(errorDescription));
    return NextResponse.redirect(redirect);
  }

  if (!code) {
    console.error("Auth callback missing code:", { href: url.toString() });
    return NextResponse.redirect(`${origin}/login?error=callback_missing_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Auth callback missing env:", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return NextResponse.redirect(new URL("/login", url));
  }

  const cookieStore = await cookies();
  let next = nextFromQuery || "/dashboard";
  try {
    if (!nextFromQuery && state) {
      const parsed = JSON.parse(state) as { next?: string } | null;
      if (parsed?.next && typeof parsed.next === "string") next = parsed.next;
    }
  } catch {
    // ignore invalid state
  }

  const response = NextResponse.redirect(new URL(next, url));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback error:", error);
    const redirect = new URL("/login", origin);
    redirect.searchParams.set("error", "callback_failed");
    redirect.searchParams.set("error_description", error.message);
    return NextResponse.redirect(redirect);
  }

  return response;
}

