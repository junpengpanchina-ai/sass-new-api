import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

function getAdminApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_DMIT_API_URL;
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

export async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const base = getAdminApiBaseUrl();
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_DMIT_API_URL (e.g. https://dmit-api.yourdomain.com)");
  }

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
    const msg = json?.message || json?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

