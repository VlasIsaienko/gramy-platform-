import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function PlayerHome() {
  const t = useTranslations("landing.player");

  return (
    <main className="min-h-screen bg-courtLine px-5 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="font-display font-bold text-court text-xl">
          graMY
        </Link>
        <span className="text-sm text-slateGray">{t("badge")}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 text-center">
        <p className="text-sm text-slateGray">{t("myRating")}</p>
        <p className="text-5xl font-bold text-court mt-1">1000</p>
        <p className="text-xs text-slateGray/70 mt-2">
          {t("ratingHint")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slateGray">{t("myTournaments")}</p>
          <p className="text-2xl font-semibold text-ink mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slateGray">{t("myMatches")}</p>
          <p className="text-2xl font-semibold text-ink mt-1">0</p>
        </div>
      </div>

      <button className="w-full mt-6 py-3.5 rounded-xl bg-shuttle text-white font-semibold shadow-md">
        {t("registerCta")}
      </button>

      <p className="text-xs text-center text-slateGray/60 mt-8">
        {t.rich("stubNote", { code: (chunks) => <code>{chunks}</code> })}
      </p>
    </main>
  );
}
