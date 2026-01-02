import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  setLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from "@/i18n";

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (lang !== currentLang) {
      setLanguage(lang);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-switcher">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={currentLang === lang ? "bg-accent" : ""}
            data-testid={`button-lang-${lang}`}
          >
            <span className="mr-2 font-medium">{LANGUAGE_FLAGS[lang]}</span>
            <span>{LANGUAGE_NAMES[lang]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
