import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  generateSalt,
  hashPin,
  verifyPin as secureVerifyPin,
  recordFailedAttempt,
  recordSuccess as clearFailedAttempts,
  checkLockStatus,
} from "../utils/security";

const AuthContext = createContext({ 
  user: null, 
  role: null, 
  loading: true,
  pinData: null,
  hasPin: false,
  verifyPin: async () => ({ success: false, error: "Not initialized" }),
  setPin: async () => false,
  refreshPin: async () => {},
  checkPinLockStatus: () => ({ isLocked: false, attemptsRemaining: 5 }),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinData, setPinData] = useState(null); // { hash: string, salt: string }
  const [hasPin, setHasPin] = useState(false);

  // Fetch user's PIN hash and salt from database
  const fetchPinData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("pin_hash, pin_salt")
        .eq("id", userId)
        .single();

      if (!error && data && data.pin_hash && data.pin_salt) {
        const pinDataObj = {
          hash: data.pin_hash,
          salt: data.pin_salt,
        };
        setPinData(pinDataObj);
        setHasPin(true);
        return pinDataObj;
      }
    } catch (err) {
      console.error("Error fetching PIN:", err);
    }
    setPinData(null);
    setHasPin(false);
    return null;
  };

  // Check if account is locked due to failed attempts
  const checkPinLockStatus = () => {
    if (!user) {
      return { isLocked: false, attemptsRemaining: 5 };
    }
    return checkLockStatus(user.id);
  };

  // Verify PIN with rate limiting - returns object with success/error
  const verifyPin = async (enteredPin) => {
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if account is locked
    const lockStatus = checkPinLockStatus();
    if (lockStatus.isLocked) {
      return { 
        success: false, 
        error: `Account locked. Try again in ${lockStatus.remainingTime}`,
        isLocked: true,
        remainingTime: lockStatus.remainingTime,
      };
    }

    // If no PIN is set in database, return false
    if (!pinData) {
      return { success: false, error: "No PIN set for this account" };
    }

    try {
      // Verify PIN using secure comparison
      const isValid = await secureVerifyPin(enteredPin, pinData.hash, pinData.salt);

      if (isValid) {
        // Clear failed attempts on success
        clearFailedAttempts(user.id);
        return { success: true };
      } else {
        // Record failed attempt
        const attemptInfo = recordFailedAttempt(user.id);
        const remaining = 5 - attemptInfo.attempts;
        
        if (attemptInfo.lockedUntil) {
          const minutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
          return { 
            success: false, 
            error: `Account locked due to too many failed attempts. Try again in ${minutes} minute(s)`,
            isLocked: true,
            attemptsRemaining: 0,
          };
        }
        
        return { 
          success: false, 
          error: `Invalid PIN. ${remaining} attempt(s) remaining`,
          attemptsRemaining: remaining,
        };
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      return { success: false, error: "Verification failed" };
    }
  };

  // Set user's PIN with secure hashing
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
      // Generate salt and hash the PIN
      const salt = generateSalt();
      const hash = await hashPin(newPin, salt);

      // Store hash and salt in database
      const { error } = await supabase
        .from("profiles")
        .update({ 
          pin_hash: hash, 
          pin_salt: salt 
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setPinData({ hash, salt });
      setHasPin(true);
      
      // Clear any failed attempts after setting new PIN
      clearFailedAttempts(user.id);
      
      return true;
    } catch (err) {
      console.error("Error setting PIN:", err);
      throw new Error("Failed to set PIN");
    }
  };

  // Refresh PIN data
  const refreshPin = async () => {
    if (user) {
      await fetchRole(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchRole = async (userId) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, pin_hash, pin_salt")
          .eq("id", userId)
          .single();

        if (mounted) {
          if (error || !data) {
            console.warn("Error fetching role (defaulting to staff):", error);
            setRole("staff");
          } else {
            setRole(data.role);
            // Handle both old plain PIN and new hashed PIN format
            if (data.pin_hash && data.pin_salt) {
              setPinData({ hash: data.pin_hash, salt: data.pin_salt });
              setHasPin(true);
            } else if (data.pin) {
              // Legacy: Migrate plain PIN to hashed on first login
              setPinData(null);
              setHasPin(!!data.pin);
            } else {
              setPinData(null);
              setHasPin(false);
            }
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
          setPinData(null);
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
      pinData, 
      hasPin,
      verifyPin, 
      setPin: setUserPin,
      refreshPin,
      checkPinLockStatus,
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
