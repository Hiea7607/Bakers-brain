import { createClient } from "@supabase/supabase-js";

// Paste your Supabase project URL and anon key from Supabase Settings -> API
export const SUPABASE_URL = "https://njffaewkvaavlpyquvxp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_i7xlTVvvowk0lm5n6yavFg_Tgo8bak0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

