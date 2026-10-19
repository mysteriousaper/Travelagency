import { ui, site } from './content.js';

export const LOCALES = ['hy', 'en', 'ru'];
export const DEFAULT_LOCALE = 'hy';
// Shown in the language switch: each language in its own script, so people find theirs at a glance.
export const LOCALE_SHORT = { hy: 'Հայ', ru: 'Рус', en: 'Eng' };
export const SWITCH_ORDER = ['hy', 'ru', 'en'];
export const LOCALE_NAMES = { hy: 'Հայերեն', en: 'English', ru: 'Русский' };

/** Returns the value for `lang` from a { en, hy, ru } object; plain values pass through. */
export function pick(value, lang) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object' || Array.isArray(value)) return value;
  return value[lang] ?? value.en ?? Object.values(value)[0] ?? '';
}

export function makeT(lang) {
  return (key) => {
    const value = key.split('.').reduce((node, part) => node?.[part], ui);
    if (value === undefined) throw new Error(`Missing text "${key}" in content/ui.yaml`);
    return pick(value, lang);
  };
}

export function href(lang, path = '') {
  return path ? `/${lang}/${path.replace(/^\/|\/$/g, '')}/` : `/${lang}/`;
}

/** The same page in another language. */
export function switchLocale(pathname, lang) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length && LOCALES.includes(parts[0])) parts[0] = lang;
  else parts.unshift(lang);
  return `/${parts.join('/')}/`;
}

export function whatsappLink(text = '') {
  const number = String(site.whatsapp_number ?? '').replace(/\D/g, '');
  if (!number) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telegramLink() {
  const user = String(site.telegram_username ?? '').replace(/^@/, '').trim();
  return user ? `https://t.me/${user}` : site.social?.telegram || null;
}

export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
export const mainBranch = () => site.branches[0];

export function monthNames(lang) {
  const format = new Intl.DateTimeFormat(lang, { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => {
    const name = format.format(new Date(2026, i, 1));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}
