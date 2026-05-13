"use client";

import Link from "next/link";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  accountLabel: string;
  goToDashboardHref: string;
};

export function LoginExistingSessionCard({ accountLabel, goToDashboardHref }: Props) {
  const [loading, setLoading] = useState(false);

  async function signOutAndSwitch() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 22, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: 22, letterSpacing: "-0.02em" }}>You are already signed in.</h1>
      <p className="muted" style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5 }}>
        Account:{" "}
        <strong style={{ color: "var(--fg, inherit)", fontWeight: 600 }}>{accountLabel}</strong>
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn btnPrimary" href={goToDashboardHref}>
          Go to dashboard
        </Link>
        <button className="btn" type="button" onClick={() => void signOutAndSwitch()} disabled={loading}>
          {loading ? "Signing out…" : "Sign out and switch account"}
        </button>
      </div>
    </div>
  );
}
