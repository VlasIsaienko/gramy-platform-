import { useTranslations } from "next-intl";

export default function AdminHome() {
  const t = useTranslations("tournaments.overview");
  const steps = t.raw("steps") as string[];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-court mb-2">
        {t("title")}
      </h1>
      <p className="text-slateGray mb-8">
        {t("subtitle")}
      </p>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex items-center gap-4 bg-white rounded-xl px-5 py-3 shadow-sm"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-court text-white text-sm font-semibold">
              {i + 1}
            </span>
            <span className="text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
