import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext({ user: null, role: null, loading: true });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRole = async (userId) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (mounted) {
          if (error || !data) {
            console.warn("Error fetching role (defaulting to staff):", error);
            setRole("staff");
          } else {
            setRole(data.role);
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
        // Add a timeout to prevent infinite loading if Supabase is unreachable
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
    <AuthContext.Provider value={{ user, role, loading }}>
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
