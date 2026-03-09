const SUPPORTED_LANGS = ['en', 'es', 'de', 'pl', 'ru', 'uk', 'bg', 'ro', 'hu', 'sk'];

const LANG_NAMES = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  bg: 'Български',
  ro: 'Română',
  hu: 'Magyar',
  sk: 'Slovenčina',
};

const COUNTRY_TO_LANG = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es',
  HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  DE: 'de', AT: 'de', CH: 'de',
  PL: 'pl',
  RU: 'ru',
  UA: 'uk',
  BG: 'bg',
  RO: 'ro', MD: 'ro',
  HU: 'hu',
  SK: 'sk',
};

let translations = {};
let currentLang = 'en';
let onChangeCallbacks = [];

async function loadTranslations(lang) {
  const resp = await fetch(`./locales/${lang}.json`);
  return resp.json();
}

async function detectLanguage() {
  const saved = localStorage.getItem('fc-lang');
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

  try {
    const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    const countryCode = data.country_code;
    if (countryCode && COUNTRY_TO_LANG[countryCode]) {
      return COUNTRY_TO_LANG[countryCode];
    }
  } catch {
    // fallback
  }

  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && SUPPORTED_LANGS.includes(browserLang)) return browserLang;

  return 'en';
}

export async function initI18n() {
  currentLang = await detectLanguage();
  translations = await loadTranslations(currentLang);
  return currentLang;
}

export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('fc-lang', lang);
  translations = await loadTranslations(lang);
  onChangeCallbacks.forEach((cb) => cb(lang));
}

export function t(key) {
  return translations[key] || key;
}

export function getLang() {
  return currentLang;
}

export function onLanguageChange(cb) {
  onChangeCallbacks.push(cb);
}

export { SUPPORTED_LANGS, LANG_NAMES };
