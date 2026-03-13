import React, { useState, useEffect, useRef } from "react";
import { X, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";

const PinVerificationModal = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  title = "Security Verification",
  subtitle = "Enter your 4-digit PIN to proceed",
  error: externalError,
  clearError,
  showForgotPin = true,
  forgotPinText = "Forgot PIN?",
  forgotPinAction
}) => {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setLocalError("");
      setShowPin(false);
      setAttemptCount(0);
      setIsLocked(false);
      setLockTime(0);
      if (clearError) clearError();
      
      // Focus input after modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, clearError]);

  // Handle lockout timer
  useEffect(() => {
    let timer;
    if (isLocked && lockTime > 0) {
      timer = setInterval(() => {
        setLockTime(prev => {
          if (prev <= 1000) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) return;
    
    // Validate PIN length
    if (pin.length !== 4) {
      setLocalError("PIN must be exactly 4 digits");
      return;
    }

    setLocalError("");
    setLoading(true);

    try {
      // Call onVerify with the entered PIN
      const result = await onVerify(pin);
      
      // Handle different result formats
      if (result && typeof result === 'object') {
        if (result.success) {
          // Verification succeeded - close modal
          onClose();
        } else {
          handleVerificationFailure(result.error || "Invalid PIN");
        }
      } else if (result === true) {
        // Legacy format handling - success
        onClose();
      } else if (result === false) {
        // Legacy format handling - failure
        handleVerificationFailure("Invalid PIN");
      } else {
        handleVerificationFailure("Verification failed");
      }
    } catch (error) {
      handleVerificationFailure(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationFailure = (errorMessage) => {
    setAttemptCount(prev => prev + 1);
    setLocalError(errorMessage);
    
    // Lock after 3 failed attempts for 30 seconds
    if (attemptCount + 1 >= 3) {
      setIsLocked(true);
      setLockTime(30000); // 30 seconds
      setLocalError("Too many failed attempts. Try again in 30 seconds.");
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    if (value.length <= 4) {
      setPin(value);
      if (localError) setLocalError("");
      if (isLocked) setIsLocked(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && pin.length === 4 && !loading && !isLocked) {
      handleSubmit(e);
    }
  };

  const handleForgotPin = () => {
    if (forgotPinAction) {
      forgotPinAction();
    }
  };

  const formatLockTime = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  // Use CSS variables for consistent dark mode styling (same approach as Clear Logs button)
  const isDarkMode = document.body.classList.contains('dark');

  // Color scheme based on theme - using CSS variables for consistency with Dashboard
  const colors = isDarkMode ? {
    // Dark theme colors - using CSS variables for consistency
    background: "var(--surface-bg, #0a0a0a)",
    surface: "var(--surface, #171717)",
    surface2: "var(--surface-2, #1f1f1f)",
    surface3: "var(--surface-3, #262626)",
    text: "var(--text-primary, #f8fafc)",
    textSecondary: "var(--text-emphasis, #e2e8f0)",
    textMuted: "var(--text-muted, #94a3b8)",
    border: "var(--border, #404040)",
    borderLight: "var(--border-light, #2a2a2a)",
    error: "var(--brand-50, #fca5a5)",
    errorDark: "var(--brand, #dc2626)",
    success: "var(--emerald, #10b981)",
    inputBg: "var(--surface-2, #1f1f1f)",
    inputBorder: "var(--border, #404040)",
    inputBorderError: "var(--brand, #dc2626)",
    inputBorderSuccess: "var(--emerald, #10b981)",
    buttonSecondary: "var(--surface-2, #334155)",
    buttonSecondaryBorder: "var(--border, #404040)",
    buttonPrimary: "linear-gradient(135deg, var(--brand, #dc2626), var(--brand-light, #ef4444))",
    buttonPrimaryHover: "linear-gradient(135deg, var(--brand-dark, #b91c1c), var(--brand, #dc2626))",
    buttonDisabled: "var(--border, #404040)",
    backdrop: "rgba(15, 5, 5, 0.85)",
    backdropBlur: "blur(16px)",
    headerBorder: "var(--border-light, #2a2a2a)",
    footerBorder: "var(--border-light, #2a2a2a)",
    shieldBg: "linear-gradient(135deg, var(--brand, #dc2626), var(--brand-light, #ef4444))",
    lockColor: "var(--brand-light, #f87171)",
    hintColor: "var(--text-muted, #94a3b8)",
    forgotPinColor: "var(--indigo, #6366f1)"
  } : {
    // Light theme colors - using CSS variables for consistency
    background: "var(--surface-bg, #f8fafc)",
    surface: "var(--surface, #ffffff)",
    surface2: "var(--surface-2, #f9fafb)",
    surface3: "var(--surface-3, #f3f4f6)",
    text: "var(--slate-800, #111827)",
    textSecondary: "var(--slate-700, #1e293b)",
    textMuted: "var(--slate-500, #64748b)",
    border: "var(--border, #e2e8f0)",
    borderLight: "var(--border-light, #f1f5f9)",
    error: "var(--brand-50, #fef2f2)",
    errorDark: "var(--brand, #dc2626)",
    success: "var(--emerald, #10b981)",
    inputBg: "var(--surface-2, #f9fafb)",
    inputBorder: "var(--border, #e2e8f0)",
    inputBorderError: "var(--brand-100, #fecaca)",
    inputBorderSuccess: "var(--emerald-50, #ecfdf5)",
    buttonSecondary: "var(--surface-2, #f9fafb)",
    buttonSecondaryBorder: "var(--border, #e2e8f0)",
    buttonPrimary: "linear-gradient(135deg, var(--brand, #dc2626), var(--brand-light, #ef4444))",
    buttonPrimaryHover: "linear-gradient(135deg, var(--brand-dark, #b91c1c), var(--brand, #dc2626))",
    buttonDisabled: "var(--slate-300, #cbd5e1)",
    backdrop: "rgba(15, 5, 5, 0.65)",
    backdropBlur: "blur(12px)",
    headerBorder: "var(--border-light, #f1f5f9)",
    footerBorder: "var(--border-light, #f1f5f9)",
    shieldBg: "linear-gradient(135deg, var(--brand, #dc2626), var(--brand-light, #ef4444))",
    lockColor: "var(--brand-light, #f87171)",
    hintColor: "var(--slate-500, #64748b)",
    forgotPinColor: "var(--indigo, #6366f1)"
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: colors.backdrop,
        backdropFilter: colors.backdropBlur,
        WebkitBackdropFilter: colors.backdropBlur,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          background: colors.surface,
          borderRadius: "22px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: isDarkMode 
            ? "0 32px 96px rgba(220,38,38,0.35), 0 8px 32px rgba(0,0,0,0.50)"
            : "0 32px 96px rgba(220,38,38,0.16), 0 8px 32px rgba(0,0,0,0.12)",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          animation: "modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "22px 26px 18px",
            borderBottom: `1px solid ${colors.headerBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: colors.shieldBg,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(220,38,38,0.3)",
              }}
            >
              <ShieldCheck size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <p 
                style={{ 
                  fontFamily: "'Syne', sans-serif", 
                  fontSize: "17px", 
                  fontWeight: 800, 
                  color: colors.text,
                  margin: 0
                }}
              >
                {title}
              </p>
              <p style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "1px", margin: 0 }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              border: `1.5px solid ${colors.border}`,
              background: colors.surface2,
              color: colors.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.color = colors.text;
              e.target.style.background = colors.surface3;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.color = colors.textSecondary;
              e.target.style.background = colors.surface2;
            }}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "26px" }}>
            {/* PIN Input */}
            <div style={{ marginBottom: "20px" }}>
              <label 
                style={{ 
                  fontSize: "12.5px", 
                  fontWeight: 600, 
                  color: colors.textSecondary, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "5px",
                  marginBottom: "8px"
                }}
              >
                <Lock size={13} style={{ color: colors.lockColor }} /> 
                Enter 4-digit PIN
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  onKeyDown={handleKeyDown}
                  placeholder="****"
                  maxLength={4}
                  disabled={isLocked}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "24px",
                    fontWeight: 700,
                    letterSpacing: "0.3em",
                    color: colors.text,
                    background: isLocked ? colors.surface2 : colors.inputBg,
                    border: `1.5px solid ${
                      localError || externalError 
                        ? colors.inputBorderError 
                        : (pin.length === 4 ? colors.inputBorderSuccess : colors.inputBorder)
                    }`,
                    borderRadius: "12px",
                    padding: "14px 45px 14px 20px",
                    outline: "none",
                    width: "100%",
                    textAlign: "center",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: pin.length === 4 && !localError && !externalError && !isLocked 
                      ? `0 0 0 3px ${colors.inputBorderSuccess}40` 
                      : "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  disabled={isLocked}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    color: isLocked ? colors.textMuted : colors.textSecondary,
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(localError || externalError) && (
                <div style={{ 
                  fontSize: "12px", 
                  color: colors.errorDark, 
                  marginTop: "8px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={14} />
                  {localError || externalError}
                </div>
              )}
              {isLocked && (
                <div style={{ 
                  fontSize: "12px", 
                  color: colors.errorDark, 
                  marginTop: "8px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: colors.surface2,
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.inputBorderError}`
                }}>
                  <Lock size={14} />
                  Too many failed attempts. Try again in {formatLockTime(lockTime)}.
                </div>
              )}
            </div>

            {/* Forgot PIN Link */}
            {showForgotPin && (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                marginBottom: "16px" 
              }}>
                <button
                  type="button"
                  onClick={handleForgotPin}
                  disabled={isLocked}
                  style={{
                    fontSize: "12px",
                    color: isLocked ? colors.textMuted : colors.forgotPinColor,
                    background: "none",
                    border: "none",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    textDecoration: "none",
                    opacity: isLocked ? 0.5 : 1,
                    transition: "color 0.2s ease, text-decoration 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLocked) {
                      e.target.style.textDecoration = "underline";
                      e.target.style.color = colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLocked) {
                      e.target.style.textDecoration = "none";
                      e.target.style.color = colors.forgotPinColor;
                    }
                  }}
                >
                  {forgotPinText}
                </button>
              </div>
            )}

            {/* Hint */}
            <p style={{ 
              fontSize: "12px", 
              color: colors.hintColor, 
              textAlign: "center",
              margin: 0,
              lineHeight: "1.4"
            }}>
              Contact your administrator if you forgot your PIN
            </p>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: "16px 26px 22px",
              display: "flex",
              gap: "10px",
              borderTop: `1px solid ${colors.footerBorder}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: colors.textSecondary,
                background: colors.buttonSecondary,
                border: `1.5px solid ${colors.buttonSecondaryBorder}`,
                borderRadius: "11px",
                padding: "11px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 4 || isLocked}
              style={{
                flex: 2,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                color: "#fff",
                background: loading || pin.length !== 4 || isLocked 
                  ? colors.buttonDisabled 
                  : colors.buttonPrimary,
                border: "none",
                borderRadius: "11px",
                padding: "11px",
                cursor: loading || pin.length !== 4 || isLocked ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                boxShadow: !loading && pin.length === 4 && !isLocked 
                  ? "0 4px 12px rgba(220,38,38,0.35)" 
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!loading && pin.length === 4 && !isLocked) {
                  e.target.style.background = colors.buttonPrimaryHover;
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 6px 16px rgba(220,38,38,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && pin.length === 4 && !isLocked) {
                  e.target.style.background = colors.buttonPrimary;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 12px rgba(220,38,38,0.35)";
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Confirm
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PinVerificationModal;
