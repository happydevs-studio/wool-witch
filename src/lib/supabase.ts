import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create the Supabase client targeting the woolwitch schema
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'woolwitch' },
  global: {
    headers: {
      'Accept-Profile': 'woolwitch',
      'Content-Profile': 'woolwitch'
    }
  }
});
