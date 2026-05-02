"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "../_lib/adminFetch";

type MeResponse = {
  ok: true;
  data: {
    id: string;
    email: string;
    profile: { role?: string; status?: string } | null;
  };
};

export function AdminGate(props: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "error">("loading");
  const [msg, setMsg] = useState<string | null>(null);

  const retryKey = useMemo(() => Date.now(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("loading");
      setMsg(null);
      try {
        const me = await adminFetch<MeResponse>("/api/me");
        const role = me.data.profile?.role;
        if (cancelled) return;
        if (role === "admin") {
          setState("allowed");
        } else {
          setState("denied");
          setMsg("403：需要管理员权限（profiles.role = admin）");
        }
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setMsg(e instanceof Error ? e.message : "无法验证管理员权限");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  if (state === "allowed") return <>{props.children}</>;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Admin</div>
      <div className="muted" style={{ fontSize: 13 }}>
        {state === "loading" ? "验证管理员权限中…" : msg || "无权限"}
      </div>
    </div>
  );
}

