"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginSuccessBanner() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const loggedIn = params.get("logged_in") === "1";
    if (!loggedIn) return;

    setVisible(true);

    const nextParams = new URLSearchParams(params.toString());
    nextParams.delete("logged_in");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });

    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [params, pathname, router]);

  if (!visible) return null;

  return (
    <div className="pill good" style={{ justifySelf: "start", display: "flex", gap: 10, alignItems: "center" }}>
      <span>登录成功。你现在可以去</span>
      <Link href="/console/topup" style={{ textDecoration: "underline" }}>
        充值与订单
      </Link>
      <button
        type="button"
        className="btn"
        style={{ padding: "6px 10px" }}
        onClick={() => setVisible(false)}
      >
        关闭
      </button>
    </div>
  );
}

