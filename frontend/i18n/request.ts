import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Файлы переводов организованы по разделам интерфейса, а не одним файлом —
// здесь они просто объединяются в один объект messages на локаль.
const NAMESPACES = [
  "common",
  "login",
  "tournaments",
  "players",
  "rating",
  "landing",
  "tournamentDetail",
  "bracketGeneration",
  "bracketDisplay",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && routing.locales.includes(requested as (typeof routing.locales)[number])
    ? requested
    : routing.defaultLocale;

  const modules = await Promise.all(
    NAMESPACES.map((ns) => import(`../messages/${locale}/${ns}.json`).then((m) => [ns, m.default] as const))
  );

  return { locale, messages: Object.fromEntries(modules) };
});
