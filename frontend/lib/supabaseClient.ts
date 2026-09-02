import { createBrowserClient } from "@supabase/ssr";

// Эти два значения берутся из файла .env.local
// (см. .env.local.example и docs/README.md, раздел "Supabase")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createBrowserClient() хранит сессию в cookie (а не в localStorage), поэтому
// middleware.ts тоже может её прочитать и защитить /admin на сервере.
// Он же бросает исключение при пустом URL, а Next.js выполняет этот модуль
// во время `next build` при статической генерации страниц — без заглушки
// отсутствующая переменная окружения валит всю сборку.
export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
