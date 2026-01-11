import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/lib/currency-provider";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, SupportedCurrency } from "@/lib/currency";

export function CurrencySwitcher() {
  const { currentCurrency, setCurrency } = useCurrency();

  const handleCurrencyChange = (currency: SupportedCurrency) => {
    if (currency !== currentCurrency) {
      setCurrency(currency);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid="button-currency-switcher"
          aria-label="Change currency"
        >
          <span className="text-lg font-medium">
            {CURRENCY_SYMBOLS[currentCurrency]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency}
            onClick={() => handleCurrencyChange(currency)}
            className={currentCurrency === currency ? "bg-accent" : ""}
            data-testid={`button-currency-${currency}`}
          >
            <span className="mr-2 font-medium text-lg">
              {CURRENCY_SYMBOLS[currency]}
            </span>
            <span>{currency}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
