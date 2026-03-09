import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import nctLogo from "@/assets/NCT_logong.png";

const LOGIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; }

  .lg-root {
    font-family: 'Inter', system-ui, sans-serif;
    height: 100vh;
    width: 100%;
    display: flex;
    background: linear-gradient(180deg, #f8f7f6, #f3f2f0);
    overflow: hidden;
    position: relative;
  }

  /* Animated background gradients */
  .lg-root::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: 
      radial-gradient(1200px 400px at 20% -20%, rgba(99,102,241,0.08), transparent 40%),
      radial-gradient(800px 300px at 120% 0%, rgba(16,185,129,0.06), transparent 40%),
      radial-gradient(600px 600px at 50% 50%, rgba(220,38,38,0.04), transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  /* Floating particles animation */
  .lg-root::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 20%, rgba(99,102,241,0.1) 1px, transparent 1px),
      radial-gradient(circle at 80% 80%, rgba(16,185,129,0.1) 1px, transparent 1px),
      radial-gradient(circle at 40% 60%, rgba(220,38,38,0.1) 1px, transparent 1px);
    background-size: 100px 100px, 120px 120px, 80px 80px;
    animation: float 20s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
  }

  /* ── Left panel ── */
  .lg-left {
    position: relative;
    width: 50%;
    display: flex;
    flex-direction: column;
    padding: 48px 56px 44px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 24px 80px rgba(220,38,38,0.25);
    border-right: 1px solid rgba(255,255,255,0.1);
  }

  .lg-left::before {
    content: '';
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
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
    z-index: 0;
  }

  .lg-slash-2 {
    position: absolute;
    bottom: -100px; right: -80px;
    width: 540px; height: 540px;
    background: linear-gradient(135deg, transparent, rgba(0,0,0,0.08) 80%);
    clip-path: polygon(30% 0, 100% 0, 70% 100%, 0 100%);
    pointer-events: none;
    z-index: 0;
  }

  .lg-bg-word {
    position: absolute;
    bottom: -40px; left: -12px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 280px;
    color: rgba(255,255,255,0.08);
    line-height: 1;
    pointer-events: none;
    white-space: nowrap;
    z-index: 0;
    letter-spacing: -6px;
    font-weight: 700;
    text-transform: uppercase;
  }

  /* Logo at top */
  .lg-logo {
    position: relative; z-index: 2;
    display: flex; align-items: center; gap: 18px;
    flex-shrink: 0;
    padding: 8px 0 24px;
    border-bottom: 1px solid rgba(255,255,255,0.15);
    margin-bottom: 16px;
  }
  .lg-logo-img {
    height: 52px; width: auto;
    object-fit: contain;
    filter: brightness(0) invert(1);
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }
  .lg-logo:hover .lg-logo-img {
    transform: scale(1.05);
  }
  .lg-logo-divider {
    width: 1.5px; height: 36px;
    background: rgba(255,255,255,0.25);
    flex-shrink: 0;
  }
  .lg-logo-text {
    font-family: 'Inter', sans-serif;
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,0.9); letter-spacing: 0.16em;
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
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.24em; text-transform: uppercase;
    color: rgba(255,255,255,0.7); margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
    animation: slideInLeft 0.6s ease-out;
  }
  .lg-hero-label::before {
    content: '';
    display: block; width: 28px; height: 2px;
    background: linear-gradient(90deg, rgba(255,255,255,0.6), transparent);
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .lg-hero-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(72px, 9vw, 112px); line-height: 0.88;
    color: #fff;
    letter-spacing: 2px;
    font-weight: 700;
    text-transform: uppercase;
    animation: slideInUp 0.8s ease-out 0.1s both;
  }
  .lg-hero-title span { color: rgba(255,255,255,0.55); }
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .lg-hero-desc {
    margin-top: 20px;
    font-size: 15px; font-weight: 300; line-height: 1.7;
    color: rgba(255,255,255,0.65); max-width: 360px;
    animation: fadeIn 0.8s ease-out 0.2s both;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Stats pinned at bottom */
  .lg-left-footer {
    position: relative; z-index: 2;
    display: flex; align-items: center; gap: 24px;
    padding-top: 32px;
    flex-shrink: 0;
    animation: slideInUp 0.8s ease-out 0.3s both;
  }
  .lg-stat { display: flex; flex-direction: column; gap: 3px; }
  .lg-stat-num {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 32px; color: #fff; line-height: 1;
    font-weight: 700;
  }
  .lg-stat-label {
    font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.12em;
    text-transform: uppercase; font-weight: 600;
  }
  .lg-stat-divider {
    width: 1px; height: 44px; background: rgba(255,255,255,0.18); flex-shrink: 0;
  }

  /* ── Right panel ── */
  .lg-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
    background: linear-gradient(180deg, #ffffff, #f8f7f6);
    position: relative;
    overflow: hidden;
  }

  .lg-right::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .lg-form-wrap {
    position: relative; z-index: 1;
    width: 100%; max-width: 460px;
    background: #ffffff;
    border-radius: 20px;
    padding: 36px;
    box-shadow: 
      0 10px 30px rgba(0,0,0,0.08),
      0 1px 3px rgba(0,0,0,0.04),
      inset 0 1px 0 rgba(255,255,255,0.6);
    border: 1px solid rgba(0,0,0,0.06);
    backdrop-filter: blur(10px);
    animation: lgSlideIn 0.5s cubic-bezier(.22,.61,.36,1) both;
  }
  
  /* Floating animation for form */
  @keyframes lgSlideIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .lg-form-eyebrow {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.24em; text-transform: uppercase;
    color: #dc2626; margin-bottom: 8px;
    display: flex; align-items: center; gap: 8px;
  }
  
  .lg-form-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 48px; color: #111827; line-height: 1;
    margin-bottom: 6px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  
  .lg-form-sub {
    font-size: 15px; color: #6b7280; font-weight: 400;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .lg-divider {
    width: 48px; height: 3px;
    background: linear-gradient(90deg, #dc2626, transparent);
    margin-bottom: 24px;
    border-radius: 2px;
  }

  .lg-error {
    display: flex; align-items: flex-start; gap: 12px;
    background: linear-gradient(180deg, #fef2f2, #fee2e2);
    border: 1px solid #fecaca;
    border-radius: 14px; padding: 14px 16px;
    margin-bottom: 18px;
    animation: lgFadeIn 0.2s ease both;
    box-shadow: 0 2px 8px rgba(220,38,38,0.08);
  }
  .lg-error-text { font-size: 14px; color: #991b1b; line-height: 1.5; }
  @keyframes lgFadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }

  .lg-fields { display: flex; flex-direction: column; gap: 16px; }
  .lg-field { display: flex; flex-direction: column; gap: 8px; }
  .lg-label {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #6b7280;
    display: flex; align-items: center; gap: 6px;
  }
  .lg-input-wrap { position: relative; display: flex; align-items: center; }
  .lg-input-icon {
    position: absolute; left: 16px;
    color: #9ca3af; pointer-events: none;
    display: flex; align-items: center;
    transition: color 0.15s ease;
  }
  .lg-input {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 15px; color: #111827;
    background: linear-gradient(180deg, #ffffff, #fafafa);
    border: 1.5px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px 16px 16px 48px;
    width: 100%; outline: none;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6);
  }
  .lg-input::placeholder { color: #9ca3af; }
  .lg-input:hover { 
    border-color: #fca5a5; 
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(220,38,38,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
  }
  .lg-input:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 4px rgba(220,38,38,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
    background: #ffffff;
  }
  .lg-input-wrap:focus-within .lg-input-icon { color: #ef4444; }

  .lg-pw-toggle {
    position: absolute; right: 14px;
    background: none; border: none; cursor: pointer;
    color: #9ca3af; padding: 8px;
    display: flex; align-items: center;
    transition: all 0.15s ease;
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }
  .lg-pw-toggle:hover { 
    color: #ef4444; 
    background: rgba(220,38,38,0.06);
  }

  .lg-btn {
    margin-top: 20px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: #fff;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 16px;
    border: none; border-radius: 14px; cursor: pointer;
    position: relative; overflow: hidden;
    transition: all 0.15s ease;
    box-shadow: 
      0 8px 24px rgba(220,38,38,0.3),
      0 2px 8px rgba(0,0,0,0.15),
      inset 0 1px 0 rgba(255,255,255,0.3);
    transform: translateY(0);
  }
  .lg-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }
  .lg-btn:hover:not(:disabled)::before { transform: translateX(100%); }
  .lg-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #b91c1c, #991b1b);
    box-shadow: 
      0 12px 32px rgba(220,38,38,0.4),
      0 4px 12px rgba(0,0,0,0.2),
      inset 0 1px 0 rgba(255,255,255,0.4);
    transform: translateY(-2px);
  }
  .lg-btn:active:not(:disabled) { 
    transform: translateY(0);
    box-shadow: 
      0 6px 16px rgba(220,38,38,0.35),
      0 2px 8px rgba(0,0,0,0.15),
      inset 0 1px 0 rgba(255,255,255,0.3);
  }
  .lg-btn:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
    transform: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .lg-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: lgSpin 0.7s linear infinite;
  }
  @keyframes lgSpin { to { transform: rotate(360deg); } }

  .lg-footer-note {
    margin-top: 20px;
    display: flex; align-items: center; gap: 10px;
    font-size: 12px; color: #9ca3af;
    justify-content: center;
  }
  .lg-footer-note::before, .lg-footer-note::after {
    content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
  }

  .lg-corner-badge {
    position: absolute; bottom: 24px; right: 24px;
    background: linear-gradient(135deg, #ffffff, #f9fafb);
    border: 1px solid #e5e7eb;
    border-radius: 12px; padding: 10px 14px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    backdrop-filter: blur(8px);
  }
  .lg-badge-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px rgba(16,185,129,0.6);
    animation: lgPulse 2s ease infinite;
  }
  @keyframes lgPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }
  .lg-badge-text { font-size: 12px; color: #6b7280; letter-spacing: 0.04em; font-weight: 500; }

  /* Responsive design */
  @media (max-width: 1024px) {
    .lg-left { width: 45%; }
    .lg-form-wrap { max-width: 420px; }
  }

  @media (max-width: 768px) {
    .lg-left { 
      display: none; 
      width: 0;
    }
    .lg-right { 
      padding: 32px 24px; 
      background: linear-gradient(180deg, #ffffff, #f8f7f6);
    }
    .lg-form-wrap { 
      max-width: 100%; 
      padding: 28px;
      border-radius: 18px;
    }
    .lg-form-title { font-size: 40px; }
    .lg-hero-title { font-size: 64px; }
  }

  @media (max-width: 480px) {
    .lg-form-wrap { padding: 24px; }
    .lg-form-title { font-size: 36px; }
    .lg-hero-title { font-size: 56px; }
    .lg-hero-desc { font-size: 14px; }
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
                      style={{ paddingRight: 48 }}
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
