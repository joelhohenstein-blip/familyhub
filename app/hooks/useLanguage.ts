import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook for managing language state and persistence
 * Handles reading/writing language to localStorage
 * Returns: { language, setLanguage, isLoading }
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>(i18n.language || 'en');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sync language state when i18n changes
    setLanguageState(i18n.language || 'en');
  }, [i18n.language]);

  const setLanguage = async (lang: string) => {
    setIsLoading(true);
    try {
      await i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
      setLanguageState(lang);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    language,
    setLanguage,
    isLoading,
  };
};

export default useLanguage;
