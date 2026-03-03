import { createClient } from "@supabase/supabase-js";

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined in environment variables");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined in environment variables");
}

if (!supabaseAnonKey.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")) {
  console.warn(
    "WARNING: Invalid Supabase Anon Key format. Check your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Fix for "Acquiring an exclusive Navigator LockManager lock" timeout
    lock: async (name, acquireTimeout, fn) => {
      return await fn();
    },
  },
});
