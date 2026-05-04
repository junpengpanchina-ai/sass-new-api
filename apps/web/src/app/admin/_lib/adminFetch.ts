import { API_ORIGIN } from "@/lib/openaiApiBase";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const base = API_ORIGIN;

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Missing Supabase session. Please login as admin.");

  const res = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const errObj = json?.error;
    const msg =
      (typeof errObj === "object" && errObj?.message) ||
      (typeof errObj === "string" && errObj) ||
      json?.message ||
      `Request failed: ${res.status}`;
    throw new Error(String(msg));
  }
  return json as T;
}

