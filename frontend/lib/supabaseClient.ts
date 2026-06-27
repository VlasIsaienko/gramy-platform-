import { createClient } from "@supabase/supabase-js";

// Эти два значения берутся из файла .env.local
// (см. .env.local.example и docs/README.md, раздел "Supabase")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
