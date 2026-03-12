import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary, ProtectedRoute } from "@/components/common";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import MobileBlocker from "@/components/MobileBlocker";
import NCT_logong from "@/assets/NCT_logong.png";

// Lazy load components for better performance
const Login = React.lazy(() => import("@/pages/Login"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));

// Enhanced Loading Screen with Logo Animation
const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <div className="relative flex flex-col items-center">
      {/* Circular Logo Container with Glowing Trace Animation */}
      <div className="relative mb-8">
        {/* Glowing Line Animation (Spinning Conic Gradient) */}
        <div 
          className="absolute -inset-[3px] rounded-full animate-spin-slow" 
          style={{
            background: 'conic-gradient(from 0deg, transparent 0 300deg, #ef4444 360deg)',
            filter: 'blur(8px)',
            opacity: 0.6
          }}
        />
        <div 
          className="absolute -inset-[3px] rounded-full animate-spin-slow" 
          style={{
            background: 'conic-gradient(from 0deg, transparent 0 300deg, #ef4444 360deg)',
            filter: 'blur(2px)'
          }}
        />
        
        {/* Logo Container */}
        <div className="relative z-10 p-6 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-center">
          <img 
            src={NCT_logong} 
            alt="NCT Logo" 
            className="w-16 h-16 object-contain"
          />
        </div>
      </div>
      
      {/* Text & Bouncing Dots */}
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight font-display">
          Asset Management System
        </h2>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  </div>
);

// Wrapper component to redirect logged-in users to dashboard
const LoginRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Wrapper component to handle role-based routing
const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If allowedRoles is specified, check if user has the required role
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to dashboard if user doesn't have permission
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  useAutoRefresh(10); // Refreshes if idle for > 55 minutes

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={
          <LoginRoute>
            <Login />
          </LoginRoute>
        } />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MobileBlocker>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </MobileBlocker>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
