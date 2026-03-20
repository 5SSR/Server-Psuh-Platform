export const LOCALE_KEY = 'idc_locale';
export const LOCALE_COOKIE_KEY = 'idc_locale';
export const ZH_LOCALE = 'zh-CN';
export const EN_LOCALE = 'en-US';

export type AppLocale = typeof ZH_LOCALE | typeof EN_LOCALE;

export function normalizeLocale(value?: string | null): AppLocale {
  if (!value) return ZH_LOCALE;
  return value.toLowerCase().startsWith('en') ? EN_LOCALE : ZH_LOCALE;
}

export function isEnLocale(value?: string | null) {
  return normalizeLocale(value) === EN_LOCALE;
}

export function hasEnPrefix(pathname: string) {
  return pathname === '/en' || pathname.startsWith('/en/');
}

export function stripLocalePrefix(pathname: string) {
  if (!hasEnPrefix(pathname)) return pathname || '/';
  const rest = pathname.slice(3);
  return rest ? rest : '/';
}

function splitUrlParts(path: string) {
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  let splitIndex = -1;

  if (queryIndex >= 0 && hashIndex >= 0) splitIndex = Math.min(queryIndex, hashIndex);
  else if (queryIndex >= 0) splitIndex = queryIndex;
  else if (hashIndex >= 0) splitIndex = hashIndex;

  if (splitIndex < 0) return { pathname: path || '/', suffix: '' };
  return {
    pathname: path.slice(0, splitIndex) || '/',
    suffix: path.slice(splitIndex)
  };
}

export function toLocalePath(path: string, locale?: string | null) {
  const { pathname, suffix } = splitUrlParts(path || '/');
  const base = stripLocalePrefix(pathname);
  if (isEnLocale(locale)) {
    return `${base === '/' ? '/en' : `/en${base}`}${suffix}`;
  }
  return `${base}${suffix}`;
}

export function toLocaleHref(path: string, locale?: string | null) {
  return toLocalePath(path, locale) as any;
}

export function toLocaleRoute(path: string, locale?: string | null) {
  return toLocalePath(path, locale) as any;
}

export function sanitizeRedirectPath(
  input?: string | null,
  fallback = '/'
) {
  if (!input || typeof input !== 'string') return fallback;
  const value = input.trim();
  if (!value.startsWith('/')) return fallback;
  // 防止 `//evil.com` 这类协议相对地址跳转
  if (value.startsWith('//')) return fallback;
  // 防止反斜杠绕过
  if (value.startsWith('/\\')) return fallback;
  return value;
}

export function readLocaleFromCookie(cookieText?: string | null): AppLocale | null {
  if (!cookieText) return null;
  const target = cookieText
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCALE_COOKIE_KEY}=`));
  if (!target) return null;
  const raw = target.slice(target.indexOf('=') + 1);
  return normalizeLocale(decodeURIComponent(raw));
}

export function resolveClientLocale(pathname?: string | null): AppLocale {
  if (typeof window === 'undefined') {
    return ZH_LOCALE;
  }

  if (pathname && hasEnPrefix(pathname)) {
    return EN_LOCALE;
  }

  const cookieLocale = readLocaleFromCookie(document.cookie);
  if (cookieLocale) return cookieLocale;

  const storedLocale = localStorage.getItem(LOCALE_KEY);
  return normalizeLocale(storedLocale);
}

export function persistLocale(locale: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLocale(locale);
  localStorage.setItem(LOCALE_KEY, normalized);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(normalized)}; path=/; expires=${expiresAt}; samesite=lax`;
  document.documentElement.lang = normalized;
  window.dispatchEvent(new CustomEvent('locale-change', { detail: normalized }));
}
