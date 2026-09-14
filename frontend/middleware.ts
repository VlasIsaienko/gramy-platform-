import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = handleI18nRouting(request);

  // next-intl уже решил редиректить (например, добавить /pl/ к пути без
  // локали) — просто отдаём этот редирект, auth-проверка случится на
  // следующем запросе, когда путь уже будет содержать локаль.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  const localeMatch = routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  const isAdminPath = localeMatch && pathname.startsWith(`/${localeMatch}/admin`);
  if (!localeMatch || !isAdminPath) {
    return intlResponse;
  }

  let response = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() сверяется с Supabase Auth, а не просто читает локальный JWT
  // из cookie — это единственная безопасная проверка на сервере.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${localeMatch}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Все пути, кроме статики Next.js и файлов с расширением (иконки и т.д.) —
  // так next-intl рекомендует матчить, чтобы локаль определялась везде.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
