import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext({ 
  user: null, 
  role: null, 
  loading: true,
  pin: null,
  hasPin: false,
  verifyPin: async () => false,
  setPin: async () => false,
  refreshPin: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPinState] = useState(null);
  const [hasPin, setHasPin] = useState(false);

  // Fetch user's PIN from database
  const fetchPin = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("pin")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const userPin = data.pin;
        setPinState(userPin);
        setHasPin(!!userPin);
        return userPin;
      }
    } catch (err) {
      console.error("Error fetching PIN:", err);
    }
    setPinState(null);
    setHasPin(false);
    return null;
  };

  // Verify PIN - returns false if no PIN, otherwise compares
  const verifyPin = async (enteredPin) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    // If no PIN is set in database, return false (invalid)
    if (!pin) {
      return false;
    }
    return enteredPin === pin;
  };

  // Set user's PIN
  const setUserPin = async (newPin) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (!newPin || newPin.length !== 4) {
      throw new Error("PIN must be exactly 4 digits");
    }
    if (!/^\d+$/.test(newPin)) {
      throw new Error("PIN must contain only numbers");
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ pin: newPin })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setPinState(newPin);
      setHasPin(true);
      return true;
    } catch (err) {
      console.error("Error setting PIN:", err);
      throw new Error("Failed to set PIN");
    }
  };

  // Refresh PIN (public method)
  const refreshPin = async () => {
    if (user) {
      await fetchPin(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchRole = async (userId) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, pin")
          .eq("id", userId)
          .single();

        if (mounted) {
          if (error || !data) {
            console.warn("Error fetching role (defaulting to staff):", error);
            setRole("staff");
          } else {
            setRole(data.role);
            setPinState(data.pin);
            setHasPin(!!data.pin);
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching role:", err);
        if (mounted) setRole("staff");
      }
    };

    // 1. Check active session immediately
    const initSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout getting session")), 5000),
        );

        const {
          data: { session },
        } = await Promise.race([sessionPromise, timeoutPromise]);

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchRole(session.user.id);
          } else {
            setUser(null);
            setRole(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
          await fetchRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setPinState(null);
          setHasPin(false);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      pin, 
      hasPin,
      verifyPin, 
      setPin: setUserPin,
      refreshPin 
    }}>
      {!loading ? (
        children
      ) : (
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
