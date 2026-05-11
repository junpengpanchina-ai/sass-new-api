import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // During `next build`, pages can be prerendered without env configured.
    // We avoid throwing at build time and instead surface a runtime message in the UI.
    if (typeof window === "undefined") return null;
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Do not pass a custom `cookies` adapter here: @supabase/ssr already uses
  // `cookie.parse` / `cookie.serialize` on document.cookie in the browser, which
  // correctly encodes JWT values and chunk names. A naive string split on "="
  // breaks values containing "=" and can prevent session cookies from persisting.
  return createBrowserClient(url, anonKey);
}

