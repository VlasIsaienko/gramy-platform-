"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Переключает locale-префикс URL, сохраняя текущий путь (включая
// динамические сегменты вроде id турнира) — просто меняет /pl/... на /ru/...
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <select
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      className="text-sm border border-black/10 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-court"
      aria-label={t("language.switcherLabel")}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>{t(`language.${l}`)}</option>
      ))}
    </select>
  );
}
