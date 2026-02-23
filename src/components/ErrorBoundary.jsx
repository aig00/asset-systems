import React, { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#faf9f9",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              border: "1px solid #fde8e8",
              boxShadow: "0 3px 20px rgba(220,38,38,0.08)",
              padding: "48px",
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                background: "#fef2f2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <AlertTriangle size={36} color="#dc2626" />
            </div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "24px",
                fontWeight: "800",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#6b7280",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              We encountered an unexpected error. Please try refreshing the page or return to the login.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                  padding: "12px 24px",
                  borderRadius: "13px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={18} /> Refresh
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#fff5f5",
                  color: "#dc2626",
                  fontSize: "15px",
                  fontWeight: "600",
                  padding: "12px 24px",
                  borderRadius: "13px",
                  border: "1.5px solid #fca5a5",
                  cursor: "pointer",
                }}
              >
                <Home size={18} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
