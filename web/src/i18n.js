import { createI18n } from 'vue-i18n';
import en from './locales/en';
import zh from './locales/zh';

const STORAGE_KEY = 'horizon-lang';

function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (_) {}
  return 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, zh },
});

export function setLocale(locale) {
  const next = locale === 'zh' ? 'zh' : 'en';
  i18n.global.locale.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (_) {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  }
}

document.documentElement.lang = detectLocale() === 'zh' ? 'zh-CN' : 'en';
