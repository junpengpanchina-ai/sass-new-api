"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  /** Where to send the browser after sign-out completes. */
  redirectTo?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function SignOutButton({ redirectTo = "/login", children, className = "btn", style }: Props) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置");
      await supabase.auth.signOut();
      window.location.href = redirectTo;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className={className} type="button" onClick={() => void signOut()} disabled={loading} style={style}>
      {loading ? "退出中…" : children ?? "退出登录"}
    </button>
  );
}
