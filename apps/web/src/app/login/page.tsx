"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

function Crown({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.82)} viewBox="0 0 34 28" fill="none" aria-hidden>
      <path
        d="M3 22.5 6.5 8l6 7.5L17 4.5l4.5 11 6-7.5 3.5 14.5H3Z"
        stroke="#DFC07A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 22.5h24" stroke="#DFC07A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6.5" cy="7.2" r="1.4" fill="#DFC07A" />
      <circle cx="17" cy="4" r="1.4" fill="#DFC07A" />
      <circle cx="27.5" cy="7.2" r="1.4" fill="#DFC07A" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("md@imperial.local");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-bg-photo" src="/login-bg.jpg" alt="" />
        <div className="login-bg-veil" />
      </div>

      <div className="login-shell">
        <section className="login-brand">
          <div className="login-brand-mark">
            <Crown size={48} />
            <strong>IMPERIAL OS</strong>
          </div>

          <p className="login-lead">Built to Lead.</p>
          <p className="login-pills">Track · Develop · Grow</p>

          <h2 className="login-headline">
            One organisation.
            <br />
            One <em>standard</em> of excellence.
          </h2>

          <div className="login-features">
            <div className="login-feature">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 19h16M7 16V10M12 16V7M17 16v-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="m14 5 3 1 2-3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Track Performance
            </div>
            <div className="login-feature">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 9.5c2.5-1.2 5-1.6 8-1.6s5.5.4 8 1.6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M12 8v10M4 9.5v7c2.5-1 5-1.4 8-1.4s5.5.4 8 1.4v-7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              Build Skills
            </div>
            <div className="login-feature">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M3 19c.7-3 2.8-4.5 6-4.5s5.3 1.5 6 4.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M14.2 14.8c1.6-.4 3.1 0 4.6 1.5.5.5.8 1.1 1 1.7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              Develop People
            </div>
            <div className="login-feature">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M8 9V6.8A4 4 0 0 1 12 3a4 4 0 0 1 4 3.8V9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M7 9h10v3.2c0 3.3-2.1 5.8-5 6.8-2.9-1-5-3.5-5-6.8V9Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M12 19v2M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Achieve More
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-head">
            <Crown size={34} />
            <h1>Welcome Back</h1>
            <p>Sign in to access your IMPERIAL OS portal</p>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div className="login-field">
              <span className="login-field-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email address"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <span className="login-field-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="M8 10V7.5a4 4 0 0 1 8 0V10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-field-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.2 3.2M9.9 5.6A10.4 10.4 0 0 1 12 5.5c5 0 8.5 4.5 9.5 6-.5.8-1.5 2.1-3.1 3.3M6.2 6.3C4.4 7.6 3.3 9.2 2.5 11.5 3.5 13 7 17.5 12 17.5c1.1 0 2.1-.2 3-.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                )}
              </button>
            </div>

            <button className="login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>

            <div className="login-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <a className="login-forgot" href="#" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>
          </form>

          <div className="login-divider">Secure. Trusted. IMPERIAL.</div>

          <div className="login-secure">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3.5 5 6.2v5.3c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6.2L12 3.5z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="m9 12 2.1 2.1L15.5 9.7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            For authorised associates only
          </div>

          <p className="login-demo">
            Demo · MD md@imperial.local · Junior associate@imperial.local · Assoc assoc@imperial.local
            <br />
            password123
          </p>
        </section>
      </div>
    </div>
  );
}
