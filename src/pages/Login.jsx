import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import nctLogo from "../assets/NCT_logong.png";

const LOGIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; }

  .lg-root {
    font-family: 'Outfit', sans-serif;
    height: 100vh;
    width: 100%;
    display: flex;
    background: #f5f4f2;
    overflow: hidden;
  }

  /* ── Left panel ── */
  .lg-left {
    position: relative;
    width: 50%;
    display: flex;
    flex-direction: column;
    padding: 52px 64px 48px;
    background: #dc2626;
    overflow: hidden;
    flex-shrink: 0;
  }

  .lg-left::before {
    content: '';
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 1;
  }

  .lg-slash {
    position: absolute;
    top: -80px; left: -140px;
    width: 680px; height: 680px;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    clip-path: polygon(0 0, 38% 0, 100% 100%, 62% 100%);
    pointer-events: none;
  }

  .lg-slash-2 {
    position: absolute;
    bottom: -100px; right: -80px;
    width: 540px; height: 540px;
    background: linear-gradient(135deg, transparent, rgba(0,0,0,0.08) 80%);
    clip-path: polygon(30% 0, 100% 0, 70% 100%, 0 100%);
    pointer-events: none;
  }

  .lg-bg-word {
    position: absolute;
    bottom: -40px; left: -12px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 280px;
    color: rgba(255,255,255,0.08);
    line-height: 1;
    pointer-events: none;
    white-space: nowrap;
    z-index: 0;
    letter-spacing: -6px;
  }

  /* Logo at top */
  .lg-logo {
    position: relative; z-index: 2;
    display: flex; align-items: center; gap: 18px;
    flex-shrink: 0;
  }
  .lg-logo-img {
    height: 56px; width: auto;
    object-fit: contain;
    filter: brightness(0) invert(1);
    flex-shrink: 0;
  }
  .lg-logo-divider {
    width: 1.5px; height: 38px;
    background: rgba(255,255,255,0.3);
    flex-shrink: 0;
  }
  .lg-logo-text {
    font-family: 'Outfit', sans-serif;
    font-size: 15px; font-weight: 600;
    color: rgba(255,255,255,0.9); letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1.35;
  }

  /* Hero fills remaining space, vertically centered */
  .lg-left-hero {
    position: relative; z-index: 2;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lg-hero-label {
    font-size: 13px; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255,255,255,0.7); margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .lg-hero-label::before {
    content: '';
    display: block; width: 32px; height: 2px;
    background: rgba(255,255,255,0.5);
  }
  .lg-hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(80px, 10vw, 120px); line-height: 0.88;
    color: #fff;
    letter-spacing: 2px;
  }
  .lg-hero-title span { color: rgba(255,255,255,0.5); }
  .lg-hero-desc {
    margin-top: 22px;
    font-size: 16px; font-weight: 300; line-height: 1.65;
    color: rgba(255,255,255,0.65); max-width: 360px;
  }

  /* Stats pinned at bottom */
  .lg-left-footer {
    position: relative; z-index: 2;
    display: flex; align-items: center; gap: 28px;
    padding-top: 36px;
    flex-shrink: 0;
  }
  .lg-stat { display: flex; flex-direction: column; gap: 3px; }
  .lg-stat-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px; color: #fff; line-height: 1;
  }
  .lg-stat-label {
    font-size: 12px; color: rgba(255,255,255,0.5); letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .lg-stat-divider {
    width: 1px; height: 48px; background: rgba(255,255,255,0.2); flex-shrink: 0;
  }

  /* ── Right panel ── */
  .lg-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 52px 64px;
    background: #f5f4f2;
    position: relative;
    overflow: hidden;
  }

  .lg-right::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 700px; height: 700px;
    background: radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%);
    pointer-events: none;
  }

  .lg-form-wrap {
    position: relative; z-index: 1;
    width: 100%; max-width: 460px;
    animation: lgSlideIn 0.5s cubic-bezier(.22,.61,.36,1) both;
  }
  @keyframes lgSlideIn {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .lg-form-eyebrow {
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: #dc2626; margin-bottom: 10px;
  }
  .lg-form-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 64px; color: #111827; line-height: 1;
    margin-bottom: 8px;
  }
  .lg-form-sub {
    font-size: 16px; color: #9ca3af; font-weight: 300;
    margin-bottom: 18px;
  }

  .lg-divider {
    width: 56px; height: 3px;
    background: linear-gradient(90deg, #dc2626, transparent);
    margin-bottom: 28px;
  }

  .lg-error {
    display: flex; align-items: flex-start; gap: 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px; padding: 16px 18px;
    margin-bottom: 20px;
    animation: lgFadeIn 0.2s ease both;
  }
  .lg-error-text { font-size: 14px; color: #991b1b; line-height: 1.5; }
  @keyframes lgFadeIn { from { opacity:0; } to { opacity:1; } }

  .lg-fields { display: flex; flex-direction: column; gap: 20px; }
  .lg-field { display: flex; flex-direction: column; gap: 8px; }
  .lg-label {
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: #6b7280;
  }
  .lg-input-wrap { position: relative; display: flex; align-items: center; }
  .lg-input-icon {
    position: absolute; left: 18px;
    color: #d1d5db; pointer-events: none;
    display: flex; align-items: center;
    transition: color 0.15s;
  }
  .lg-input {
    font-family: 'Outfit', sans-serif;
    font-size: 16px; color: #111827;
    background: #fff;
    border: 2px solid #e5e7eb;
    border-radius: 14px;
    padding: 17px 18px 17px 52px;
    width: 100%; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }
  .lg-input::placeholder { color: #d1d5db; }
  .lg-input:hover { border-color: #fca5a5; }
  .lg-input:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 4px rgba(220,38,38,0.10);
  }
  .lg-input-wrap:focus-within .lg-input-icon { color: #ef4444; }

  .lg-pw-toggle {
    position: absolute; right: 16px;
    background: none; border: none; cursor: pointer;
    color: #d1d5db; padding: 6px;
    display: flex; align-items: center;
    transition: color 0.15s; border-radius: 6px;
  }
  .lg-pw-toggle:hover { color: #ef4444; }

  .lg-btn {
    margin-top: 28px;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    width: 100%;
    background: #dc2626;
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 15px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 20px;
    border: none; border-radius: 14px; cursor: pointer;
    position: relative; overflow: hidden;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 6px 20px rgba(220,38,38,0.32);
  }
  .lg-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  .lg-btn:hover:not(:disabled)::before { transform: translateX(100%); }
  .lg-btn:hover:not(:disabled) {
    background: #b91c1c;
    box-shadow: 0 10px 32px rgba(220,38,38,0.40);
    transform: translateY(-2px);
  }
  .lg-btn:active:not(:disabled) { transform: translateY(0); }
  .lg-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .lg-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: lgSpin 0.7s linear infinite;
  }
  @keyframes lgSpin { to { transform: rotate(360deg); } }

  .lg-footer-note {
    margin-top: 24px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: #d1d5db;
  }
  .lg-footer-note::before, .lg-footer-note::after {
    content: ''; flex: 1; height: 1px; background: #e5e7eb;
  }

  .lg-corner-badge {
    position: absolute; bottom: 28px; right: 28px;
    background: #fff; border: 1px solid #e5e7eb;
    border-radius: 12px; padding: 12px 16px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  }
  .lg-badge-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
    animation: lgPulse 2s ease infinite;
  }
  @keyframes lgPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .lg-badge-text { font-size: 13px; color: #9ca3af; letter-spacing: 0.04em; }

  @media (max-width: 768px) {
    .lg-left { display: none; }
    .lg-right { padding: 32px 24px; }
  }
`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  };

  return (
    <>
      <style>{LOGIN_STYLES}</style>
      <div className="lg-root">

        {/* LEFT PANEL */}
        <div className="lg-left">
          <div className="lg-slash" />
          <div className="lg-slash-2" />
          <div className="lg-bg-word">ASSETS</div>

          <div className="lg-logo">
            <img src={nctLogo} alt="NCT Logo" className="lg-logo-img" />
            <div className="lg-logo-divider" />
            <span className="lg-logo-text">NCT Asset<br/>Manager</span>
          </div>

          <div className="lg-left-hero">
            <p className="lg-hero-label">Asset Intelligence</p>
            <h2 className="lg-hero-title">
              TRACK.<br />
              MANAGE.<br />
              <span>CONTROL.</span>
            </h2>
            <p className="lg-hero-desc">
              A unified platform for tracking, managing, and optimizing your
              organization's assets in real time.
            </p>
          </div>

          <div className="lg-left-footer">
            <div className="lg-stat">
              <span className="lg-stat-num">100%</span>
              <span className="lg-stat-label">Visibility</span>
            </div>
            <div className="lg-stat-divider" />
            <div className="lg-stat">
              <span className="lg-stat-num">24/7</span>
              <span className="lg-stat-label">Monitoring</span>
            </div>
            <div className="lg-stat-divider" />
            <div className="lg-stat">
              <span className="lg-stat-num">SSL</span>
              <span className="lg-stat-label">Secured</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg-right">
          <div className="lg-form-wrap">
            <p className="lg-form-eyebrow">Secure Access</p>
            <h1 className="lg-form-title">Sign In</h1>
            <p className="lg-form-sub">Enter your credentials to continue</p>
            <div className="lg-divider" />

            {errorMsg && (
              <div className="lg-error">
                <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                <p className="lg-error-text">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="lg-fields">
                <div className="lg-field">
                  <label className="lg-label">Email Address</label>
                  <div className="lg-input-wrap">
                    <span className="lg-input-icon"><Mail size={18} /></span>
                    <input
                      className="lg-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="lg-field">
                  <label className="lg-label">Password</label>
                  <div className="lg-input-wrap">
                    <span className="lg-input-icon"><Lock size={18} /></span>
                    <input
                      className="lg-input"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 52 }}
                    />
                    <button
                      type="button"
                      className="lg-pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="lg-btn" disabled={loading}>
                {loading ? (
                  <><span className="lg-spinner" /> Authenticating…</>
                ) : (
                  <>Access Dashboard <ArrowRight size={18} strokeWidth={2.5} /></>
                )}
              </button>
            </form>

            <p className="lg-footer-note">Secured access · NCT Asset System</p>
          </div>

          <div className="lg-corner-badge">
            <div className="lg-badge-dot" />
            <span className="lg-badge-text">All systems operational</span>
          </div>
        </div>

      </div>
    </>
  );
};

export default Login;