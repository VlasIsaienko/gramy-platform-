import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/router — переключение языка сохраняет текущий путь.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
