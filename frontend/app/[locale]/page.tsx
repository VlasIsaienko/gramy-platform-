import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Home() {
  const t = useTranslations("landing");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-court">graMY</h1>
        <p className="mt-2 text-slateGray">
          {t("tagline")}
        </p>
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        <Link
          href="/admin"
          className="px-8 py-5 rounded-2xl bg-court text-white text-lg font-semibold shadow-md hover:bg-court/90 transition"
        >
          {t("organizerCta")}
        </Link>
        <Link
          href="/player"
          className="px-8 py-5 rounded-2xl bg-shuttle text-white text-lg font-semibold shadow-md hover:bg-shuttle/90 transition"
        >
          {t("playerCta")}
        </Link>
      </div>
    </main>
  );
}
