import { useTranslation } from 'react-i18next';
import { useLanguage } from '~/hooks/useLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

/**
 * Shadcn dropdown component for language selection
 * Displays language codes, handles language change with immediate UI update
 */
export function LanguageMenu() {
  const { i18n } = useTranslation();
  const { setLanguage } = useLanguage();

  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-xs uppercase font-semibold">
            {currentLanguage?.code || 'en'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="cursor-pointer"
            aria-current={i18n.language === lang.code ? 'page' : undefined}
          >
            {lang.label}
            {i18n.language === lang.code && <span className="ml-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
