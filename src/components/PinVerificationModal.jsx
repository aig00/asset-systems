import React, { useState, useEffect } from "react";
import { X, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

const PinVerificationModal = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  title = "Security Verification",
  subtitle = "Enter your 4-digit PIN to proceed",
  error: externalError,
  clearError
}) => {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setLocalError("");
      setShowPin(false);
      if (clearError) clearError();
    }
  }, [isOpen, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      setLocalError("PIN must be exactly 4 digits");
      return;
    }

    setLocalError("");
    setLoading(true);

    try {
      // Call onVerify and handle the response format
      const result = await onVerify(pin);
      
      // If result is an object with success property (new secure format)
      if (result && typeof result === 'object') {
        if (!result.success) {
          setLocalError(result.error || "Invalid PIN");
        }
      } else if (result === false) {
        // Legacy format handling
        setLocalError("Invalid PIN");
      }
      // If result is true, verification succeeded - modal will close
    } catch (error) {
      setLocalError(error.message || "Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    if (value.length <= 4) {
      setPin(value);
      setLocalError("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && pin.length === 4) {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 5, 5, 0.48)",
        backdropFilter: "blur(7px)",
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
          background: "#ffffff",
          borderRadius: "22px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 32px 96px rgba(220,38,38,0.16), 0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid #fde8e8",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "22px 26px 18px",
            borderBottom: "1px solid #fef0f0",
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
                background: "linear-gradient(135deg, #dc2626, #ef4444)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                  color: "#111827" 
                }}
              >
                {title}
              </p>
              <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "1px" }}>
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
              border: "1.5px solid #fde8e8",
              background: "#fff5f5",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
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
                  color: "#374151", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "5px",
                  marginBottom: "8px"
                }}
              >
                <Lock size={13} style={{ color: "#f87171" }} /> 
                Enter PIN
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  onKeyDown={handleKeyDown}
                  placeholder="****"
                  maxLength={4}
                  autoFocus
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "24px",
                    fontWeight: 700,
                    letterSpacing: "0.3em",
                    color: "#111827",
                    background: "#fafafa",
                    border: `1.5px solid ${localError || externalError ? "#fecaca" : "#f3e8e8"}`,
                    borderRadius: "12px",
                    padding: "14px 45px 14px 20px",
                    outline: "none",
                    width: "100%",
                    textAlign: "center",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(localError || externalError) && (
                <p 
                  style={{ 
                    fontSize: "12px", 
                    color: "#dc2626", 
                    marginTop: "8px",
                    fontWeight: 500
                  }}
                >
                  {localError || externalError}
                </p>
              )}
            </div>

            {/* Hint */}
            <p style={{ 
              fontSize: "12px", 
              color: "#9ca3af", 
              textAlign: "center",
              margin: 0
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
              borderTop: "1px solid #fef0f0",
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
                color: "#6b7280",
                background: "#f9fafb",
                border: "1.5px solid #e5e7eb",
                borderRadius: "11px",
                padding: "11px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              style={{
                flex: 2,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                color: "#fff",
                background: loading || pin.length !== 4 
                  ? "#9ca3af" 
                  : "linear-gradient(135deg, #dc2626, #ef4444)",
                border: "none",
                borderRadius: "11px",
                padding: "11px",
                cursor: loading || pin.length !== 4 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {loading ? "Verifying..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinVerificationModal;
