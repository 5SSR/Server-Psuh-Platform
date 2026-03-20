import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  EN_LOCALE,
  LOCALE_COOKIE_KEY,
  ZH_LOCALE,
  hasEnPrefix,
  normalizeLocale,
  stripLocalePrefix
} from './lib/locale';

const PUBLIC_FILE = /\.[^/]+$/;

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    PUBLIC_FILE.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE_KEY)?.value);
  const requestHeaders = new Headers(request.headers);

  if (hasEnPrefix(pathname)) {
    requestHeaders.set('x-idc-locale', EN_LOCALE);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = stripLocalePrefix(pathname);
    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders }
    });
    response.cookies.set(LOCALE_COOKIE_KEY, EN_LOCALE, {
      path: '/',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60
    });
    return response;
  }

  if (cookieLocale === EN_LOCALE) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname === '/' ? '/en' : `/en${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  requestHeaders.set('x-idc-locale', ZH_LOCALE);
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)']
};
