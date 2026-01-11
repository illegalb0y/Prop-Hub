import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  setLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from "@/i18n";
import { useCurrency } from "@/lib/currency-provider";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES, type SupportedCurrency } from "@/lib/currency";
import { Globe, Palette, DollarSign } from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();
  const { currentCurrency, setCurrency } = useCurrency();

  const handleLanguageChange = (lang: string) => {
    if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) && lang !== currentLang) {
      setLanguage(lang as SupportedLanguage);
    }
  };

  const handleCurrencyChange = (currency: string) => {
    if (SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency) && currency !== currentCurrency) {
      setCurrency(currency as SupportedCurrency);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold" data-testid="text-page-title">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("settings.appearance")}
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>{t("settings.currency")}</CardTitle>
            </div>
            <CardDescription>{t("settings.selectCurrency")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currentCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-48" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency} data-testid={`option-currency-${currency}`}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{CURRENCY_SYMBOLS[currency]}</span>
                      <span>{CURRENCY_NAMES[currency]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>{t("settings.language")}</CardTitle>
            </div>
            <CardDescription>{t("settings.selectLanguage")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currentLang} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-48" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang} data-testid={`option-lang-${lang}`}>
                    {LANGUAGE_NAMES[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>{t("settings.theme")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearance")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label>{t("settings.theme")}:</Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
