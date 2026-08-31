import { createClient } from "@supabase/supabase-js";

// Paste your Supabase project URL and anon key from Supabase Settings -> API
export const SUPABASE_URL = "https://kaysdyuzznbqcbkmuakj.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Y3c1ywVeLrTXoeCTAtliug_1IxwaXKv";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

