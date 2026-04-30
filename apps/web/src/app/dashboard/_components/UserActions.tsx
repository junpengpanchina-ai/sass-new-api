"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UserActions() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置");
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn" type="button" onClick={signOut} disabled={loading} style={{ justifyContent: "flex-start" }}>
      {loading ? "退出中…" : "退出登录"}
    </button>
  );
}

