import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};

export const initializeI18n = () => {
  if (i18next.isInitialized) {
    return i18next;
  }

  i18next
    .use(LanguageDetector)
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      defaultNS: 'translation',
      ns: ['translation'],
      debug: false,
      interpolation: {
        escapeValue: false, // React already handles XSS
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
      react: {
        useSuspense: false, // Disable Suspense for now
      },
    });

  return i18next;
};

export default initializeI18n;
