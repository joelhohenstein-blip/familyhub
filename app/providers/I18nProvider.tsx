import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useToast } from '~/hooks/use-toast';
import initializeI18n from '~/utils/i18n.config';

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Context provider that wraps I18nextProvider from react-i18next
 * Initializes i18n on mount, detects browser language,
 * handles fallback to English with toast notification on mount
 */
export const I18nProvider = ({ children }: I18nProviderProps) => {
  const { toast } = useToast();
  const [i18n] = useState(() => initializeI18n());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const handleLanguageDetection = async () => {
      try {
        if (i18n) {
          const detectedLanguage = i18n.language;
          const supportedLanguages = ['en', 'es', 'fr'];
          const isSupported = supportedLanguages.includes(detectedLanguage);

          if (!isSupported) {
            // Show notification and fallback to English
            toast({
              title: 'Language',
              description: i18n.t('notifications.languageFallback'),
              duration: 3000,
            });
            await i18n.changeLanguage('en');
          }

          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error during language detection:', error);
        setIsInitialized(true);
      }
    };

    handleLanguageDetection();
  }, [i18n, toast]);

  if (!isInitialized) {
    return <>{children}</>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
