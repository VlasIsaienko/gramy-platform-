"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabaseClient";
import LanguageSwitcher from "./LanguageSwitcher";

export default function AdminNav() {
  const router = useRouter();
  const t = useTranslations("common");

  const links = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/tournaments", label: t("nav.tournaments") },
    { href: "/admin/players", label: t("nav.players") },
    { href: "/admin/rating", label: t("nav.rating") },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="w-full border-b border-black/10 bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-display font-bold text-court text-xl">
          {t("nav.brand")} <span className="text-shuttle">/ {t("nav.brandSuffix")}</span>
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
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="text-sm text-slateGray hover:text-shuttle transition"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}
