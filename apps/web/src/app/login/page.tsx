"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const AUTH_DEBUG_VERSION = "hard-oauth-2026-05-05-01";

const PHONE_COUNTRIES = [
  { label: "China", code: "+86", example: "18617378246" },
  { label: "United States", code: "+1", example: "4155552671" },
  { label: "Singapore", code: "+65", example: "81234567" },
  { label: "Hong Kong", code: "+852", example: "51234567" },
  { label: "Japan", code: "+81", example: "9012345678" },
  { label: "United Kingdom", code: "+44", example: "7400123456" },
  { label: "Canada", code: "+1", example: "4165552671" },
  { label: "Australia", code: "+61", example: "412345678" },
  { label: "Malaysia", code: "+60", example: "123456789" },
  { label: "Thailand", code: "+66", example: "812345678" }
] as const;

export default function LoginPage() {
  const [next, setNext] = useState("/console/models");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthTip, setOauthTip] = useState<string | null>(null);

  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [localPhone, setLocalPhone] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+86");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/console/models");
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const buildE164Phone = () => {
    const digits = localPhone.replace(/\D/g, "");
    return `${selectedCountryCode}${digits}`;
  };

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  const sendPhoneOtp = async () => {
    try {
      setPhoneError(null);

      const digits = localPhone.replace(/\D/g, "");
      const e164Phone = `${selectedCountryCode}${digits}`;

      if (!digits) {
        setPhoneError("Please enter your phone number.");
        return;
      }

      if (digits.length < 6) {
        setPhoneError("Please enter a valid phone number.");
        return;
      }

      if (sendCount >= 3) {
        setPhoneError("Too many attempts. Please try again later.");
        return;
      }

      if (cooldown > 0) {
        setPhoneError(`Please wait ${cooldown}s before requesting another code.`);
        return;
      }

      setPhoneLoading(true);

      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      console.log("[phone-auth] sending OTP to:", e164Phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone
      });

      if (error) {
        console.error("[phone-auth] send OTP failed:", error);
        setPhoneError(error.message);
        return;
      }

      setOtpSent(true);
      setSendCount((value) => value + 1);
      setCooldown(60);
    } catch (err: any) {
      console.error("[phone-auth] unexpected send OTP error:", err);
      setPhoneError(err?.message || "Failed to send code.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    try {
      setPhoneError(null);

      const digits = localPhone.replace(/\D/g, "");
      const normalizedOtp = otp.trim();
      const e164Phone = `${selectedCountryCode}${digits}`;

      if (!digits) {
        setPhoneError("Please enter your phone number.");
        return;
      }

      if (digits.length < 6) {
        setPhoneError("Please enter a valid phone number.");
        return;
      }

      if (!normalizedOtp || normalizedOtp.length !== 6) {
        setPhoneError("Please enter the 6-digit code.");
        return;
      }

      setPhoneLoading(true);

      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase 未配置：请设置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");

      console.log("[phone-auth] verifying OTP for:", e164Phone);

      const { error } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: normalizedOtp,
        type: "sms"
      });

      if (error) {
        console.error("[phone-auth] verify OTP failed:", error);
        setPhoneError(error.message);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("[phone-auth] unexpected verify OTP error:", err);
      setPhoneError(err?.message || "Failed to verify code.");
    } finally {
      setPhoneLoading(false);
    }
  };

  async function onGoogleLogin() {
    setError(null);
    setOauthTip("已点击 Google 登录，准备跳转授权页…");
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      console.log("[auth]", AUTH_DEBUG_VERSION);
      console.log("[auth] Google login clicked");
      console.log("[auth] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);

      if (!supabaseUrl) {
        const msg = "Missing NEXT_PUBLIC_SUPABASE_URL";
        console.error("[auth]", msg);
        setError(msg);
        alert(msg);
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback`;
      const authorizeUrl =
        `${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize` +
        `?provider=google` +
        `&redirect_to=${encodeURIComponent(redirectTo)}` +
        `&state=${encodeURIComponent(JSON.stringify({ next }))}`;

      console.log("[auth] redirectTo:", redirectTo);
      console.log("[auth] authorizeUrl:", authorizeUrl);

      window.location.href = authorizeUrl;
    } catch (err) {
      console.error("[auth] Unexpected Google login error:", err);
      const msg = err instanceof Error ? err.message : "OAuth 登录失败";
      setError(msg);
      alert(msg);
      setOauthTip(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 920 }}>
      <div className="card" style={{ padding: 22, display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }}>
        <section style={{ minWidth: 0 }}>
          <div className="pill">登录</div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: "-0.02em" }}>欢迎回来</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            使用账号密码登录，或使用 Google 一键登录。
          </p>

          <form onSubmit={onLogin} style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                邮箱
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                className="input"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                密码
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                required
                className="input"
              />
            </label>

            {error ? (
              <div className="pill bad" style={{ justifySelf: "start" }}>
                {error}
              </div>
            ) : null}
            {oauthTip ? (
              <div className="pill good" style={{ justifySelf: "start" }}>
                {oauthTip}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btnPrimary" type="submit" disabled={loading}>
                {loading ? "处理中…" : "登录"}
              </button>
              <Link className="btn" href="/forgot-password">
                忘记密码
              </Link>
              <Link className="btn" href="/register">
                去注册
              </Link>
            </div>
          </form>
        </section>

        <aside className="card" style={{ padding: 16, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>第三方登录</div>
          <div className="muted" style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
            Auth Debug Version: {AUTH_DEBUG_VERSION}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            点击按钮跳转授权后自动登录。
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => void onGoogleLogin()} disabled={loading}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(124,92,255,0.9)" }} />
              {loading ? "正在跳转…" : "使用 Google 登录"}
            </button>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            <button
              type="button"
              onClick={() => setShowPhoneLogin((value) => !value)}
              className="btn"
              style={{
                width: "100%",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.10)"
              }}
              disabled={loading}
            >
              Other sign-in options
            </button>

            {showPhoneLogin ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  padding: 12
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Phone login</div>
                <div className="muted" style={{ fontSize: 12, opacity: 0.75 }}>
                  Select your country code, then enter your phone number.
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Country / Region
                    </div>
                    <select
                      value={selectedCountryCode}
                      onChange={(event) => setSelectedCountryCode(event.target.value)}
                      className="input"
                      disabled={phoneLoading}
                    >
                      {PHONE_COUNTRIES.map((country) => (
                        <option key={`${country.label}-${country.code}`} value={country.code}>
                          {country.label} {country.code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Phone number
                    </div>
                    <input
                      value={localPhone}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d]/g, "");
                        setLocalPhone(value);
                      }}
                      placeholder={PHONE_COUNTRIES.find((country) => country.code === selectedCountryCode)?.example || "Phone number"}
                      inputMode="tel"
                      className="input"
                      disabled={phoneLoading}
                    />
                  </label>

                  {localPhone ? (
                    <div className="muted" style={{ fontSize: 12, opacity: 0.7 }}>
                      Verification code will be sent to {buildE164Phone()}
                    </div>
                  ) : null}

                  {otpSent ? (
                    <label style={{ display: "grid", gap: 6 }}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Verification code
                      </div>
                      <input
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit code"
                        inputMode="numeric"
                        className="input"
                        disabled={phoneLoading}
                      />
                    </label>
                  ) : null}

                  {phoneError ? (
                    <div className="pill bad" style={{ justifySelf: "start" }}>
                      {phoneError}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void sendPhoneOtp()}
                      disabled={phoneLoading || cooldown > 0}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : phoneLoading ? "Sending..." : "Send code"}
                    </button>

                    {otpSent ? (
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={() => void verifyPhoneOtp()}
                        disabled={phoneLoading}
                      >
                        {phoneLoading ? "Verifying..." : "Verify and sign in"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            提示：需要在 Supabase Auth 里启用 Google Provider，并配置回调地址。
          </div>
        </aside>
      </div>
    </main>
  );
}

