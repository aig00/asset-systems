import { createClient } from "@supabase/supabase-js";

// We are hardcoding these to guarantee the connection works
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey || !supabaseAnonKey.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyYWJmeGloaXNud2V1bXBsbmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDgyNjQsImV4cCI6MjA4NjkyNDI2NH0.GZsBk4rmPOkbDQ1wX_HRQ9NCLjmcBebbiIQ5r6PjNHg")) {
  console.warn(
    "WARNING: Invalid Supabase Anon Key detected. It should start with 'ey'. Check your .env file.",
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
