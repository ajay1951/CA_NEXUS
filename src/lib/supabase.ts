import { createClient } from "@supabase/supabase-js";

// 🔐 Read environment variables (Vite only exposes VITE_ prefixed keys)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🚨 Validate environment variables (prevents silent failures)
if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is missing in .env file");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is missing in .env file");
}

// 🚀 Create Supabase client with performance optimizations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Performance optimizations
  global: {
    headers: {
      'Prefer': 'return=representation',
    },
  },
  // Enable connection pooler for faster connections
  db: {
    schema: 'public',
  },
});