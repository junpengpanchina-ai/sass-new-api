import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
        hasUser: false,
        userId: null,
        email: null,
        phone: null,
        host: headerStore.get("host"),
        cookieNames: cookieStore.getAll().map((c) => c.name),
      },
      { status: 500 },
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // debug endpoint: readonly
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: !error,
    error: error?.message ?? null,
    hasUser: Boolean(data.user),
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
    phone: (data.user as any)?.phone ?? null,
    host: headerStore.get("host"),
    cookieNames: cookieStore.getAll().map((c) => c.name),
  });
}
