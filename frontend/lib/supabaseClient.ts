import { createClient } from "@supabase/supabase-js";

// Эти два значения берутся из файла .env.local
// (см. .env.local.example и docs/README.md, раздел "Supabase")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createClient() бросает исключение при пустом URL, а Next.js выполняет
// этот модуль во время `next build` при статической генерации страниц —
// без заглушки отсутствующая переменная окружения валит всю сборку.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
