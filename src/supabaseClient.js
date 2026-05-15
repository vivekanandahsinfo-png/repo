import { createClient } from "@supabase/supabase-js";

// Cleaned up the URL to prevent "Invalid URL" errors
const SUPABASE_URL = "https://qlfnaqsayucvnpuehvbm.supabase.co"; 
const SUPABASE_PUBLIC_KEY = "sb_publishable_3EQCKT-uVflNW2ArFFe1Iw_Hl5zWc2s"; 

// Safely initialize the client so it doesn't crash if the URL is somehow still invalid
let client = null;
try {
  client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
} catch (e) {
  console.error("Supabase init error:", e);
}

export const supabase = client;
