import { createClient } from "@supabase/supabase-js";

// These should ideally be in .env.local, but since the user has a static frontend,
// we'll keep them here for the migration to ensure nothing breaks.
const supabaseUrl = "https://vwoaecijtbskjicteosr.supabase.co";
const supabaseAnonKey = "sb_publishable_GXKm5NL1G9EwGiX7W2DWBQ_9Vqpey8J";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
