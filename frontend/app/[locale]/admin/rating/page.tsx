import { useTranslations } from "next-intl";

export default function RatingPage() {
  const t = useTranslations("rating");

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-court mb-6">
        {t("title")}
      </h1>

      <div className="bg-white rounded-xl p-8 text-center text-slateGray shadow-sm">
        {t("stubMessage")}
        <p className="text-xs mt-4 text-slateGray/70">
          {t.rich("stubNote", { code: (chunks) => <code>{chunks}</code> })}
        </p>
      </div>
    </div>
  );
}
