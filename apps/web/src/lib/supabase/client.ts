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

  return createBrowserClient(url, anonKey, {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        return document.cookie
          .split(";")
          .map((cookie) => cookie.trim())
          .filter(Boolean)
          .map((cookie) => {
            const eqIndex = cookie.indexOf("=");
            if (eqIndex === -1) return null;
            const name = cookie.slice(0, eqIndex);
            const value = cookie.slice(eqIndex + 1);
            return { name, value };
          })
          .filter((c): c is { name: string; value: string } => Boolean(c?.name));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${name}=${value}`;
          if (options?.path) cookie += `; Path=${options.path}`;
          if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
          if (options?.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.secure) cookie += `; Secure`;
          if (options?.domain) cookie += `; Domain=${options.domain}`;
          document.cookie = cookie;
        });
      },
    },
  });
}

