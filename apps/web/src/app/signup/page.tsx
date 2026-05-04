"use client";

import { useEffect } from "react";

export default function SignupAliasPage() {
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    const url = next ? `/register?next=${encodeURIComponent(next)}` : "/register";
    window.location.replace(url);
  }, []);

  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="pill">Redirect</div>
        <h1 style={{ margin: "10px 0 6px", fontSize: 20 }}>正在跳转到注册页…</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          如果没有自动跳转，请访问 <a href="/register">/register</a>。
        </p>
      </div>
    </main>
  );
}

