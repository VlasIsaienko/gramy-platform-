"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/tournaments", label: "Турниры" },
  { href: "/admin/players", label: "Игроки" },
  { href: "/admin/rating", label: "Рейтинг" },
];

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="w-full border-b border-black/10 bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-display font-bold text-court text-xl">
          graMY <span className="text-shuttle">/ admin</span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink/80 hover:text-court font-medium"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="text-sm text-slateGray hover:text-shuttle transition"
          >
            Выйти
          </button>
        </div>
      </div>
    </nav>
  );
}
