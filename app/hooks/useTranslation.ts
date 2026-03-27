import { useTranslation as useReactI18nextTranslation } from 'react-i18next';

/**
 * Custom hook wrapping react-i18next's useTranslation
 * Provides t() function for translating strings and language change capability
 */
export const useTranslation = () => {
  const { t, i18n } = useReactI18nextTranslation();

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage: (lang: string) => i18n.changeLanguage(lang),
  };
};

export default useTranslation;
