import type { User } from "@supabase/supabase-js";

/** Human-readable account label for email / phone / OAuth profiles. */
export function getAccountDisplayLabel(user: User | null | undefined): string {
  if (!user) return "";

  const email = user.email?.trim();
  if (email) return email;

  const phone = user.phone?.trim();
  if (phone) return phone;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.user_name === "string" && meta.user_name.trim()) ||
    (typeof meta?.preferred_username === "string" && meta.preferred_username.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim());
  if (fromMeta) return fromMeta;

  for (const identity of user.identities ?? []) {
    const data = identity.identity_data as Record<string, unknown> | undefined;
    const handle =
      (typeof data?.user_name === "string" && data.user_name.trim()) ||
      (typeof data?.preferred_username === "string" && data.preferred_username.trim()) ||
      (typeof data?.phone === "string" && data.phone.trim()) ||
      (typeof data?.email === "string" && data.email.trim());
    if (handle) {
      if (identity.provider === "github") return handle.startsWith("@") ? handle : `@${handle}`;
      return handle;
    }
  }

  return `${user.id.slice(0, 8)}…`;
}
