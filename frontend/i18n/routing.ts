import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pl", "ru", "uk", "en"],
  defaultLocale: "pl",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
