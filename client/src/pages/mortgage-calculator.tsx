import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/lib/currency-provider";
import { formatCurrency } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, LineChart } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface MortgageParams {
  propertyValue: number;
  downPayment: number;
  loanTerm: number;
  interestRate: number;
}

interface AmortizationData {
  year: number;
  principal: number;
  interest: number;
  balance: number;
  totalPayment: number;
}

export default function MortgageCalculatorPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [calculatorCurrency, setCalculatorCurrency] = useState<"USD" | "EUR" | "AMD">("USD");

  const DEFAULT_PARAMS: MortgageParams = {
    propertyValue: 500000,
    downPayment: 100000,
    loanTerm: 20,
    interestRate: 8,
  };

  const [params, setParams] = useState<MortgageParams>(DEFAULT_PARAMS);
  const [activeParams, setActiveParams] = useState<MortgageParams>(DEFAULT_PARAMS);

  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const handleCalculate = () => {
    setActiveParams(params);
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    setActiveParams(DEFAULT_PARAMS);
  };

  // Расчет процента первоначального взноса
  const downPaymentPercent = useMemo(() => {
    return (params.downPayment / params.propertyValue) * 100;
  }, [params.downPayment, params.propertyValue]);

  // Обновление первоначального взноса по проценту
  const updateDownPaymentByPercent = useCallback((percent: number) => {
    const newDownPayment = (params.propertyValue * percent) / 100;
    setParams(prev => ({ ...prev, downPayment: Math.round(newDownPayment) }));
  }, [params.propertyValue]);

  // Расчет ежемесячного платежа по формуле аннуитета
  const monthlyPayment = useMemo(() => {
    const loanAmount = activeParams.propertyValue - activeParams.downPayment;
    const monthlyRate = activeParams.interestRate / 12 / 100;
    const numPayments = activeParams.loanTerm * 12;

    if (monthlyRate === 0) {
      return loanAmount / numPayments;
    }

    const monthlyPayment = 
      loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    return monthlyPayment;
  }, [activeParams]);

  // Генерация графика погашения по годам
  const amortizationSchedule = useMemo<AmortizationData[]>(() => {
    const loanAmount = activeParams.propertyValue - activeParams.downPayment;
    const monthlyRate = activeParams.interestRate / 12 / 100;
    const numPayments = activeParams.loanTerm * 12;
    const schedule: AmortizationData[] = [];

    let balance = loanAmount;

    for (let year = 1; year <= activeParams.loanTerm; year++) {
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let month = 1; month <= 12; month++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;

        yearlyInterest += interestPayment;
        yearlyPrincipal += principalPayment;
        balance -= principalPayment;

        if (balance < 0) balance = 0;
      }

      schedule.push({
        year,
        principal: Math.round(yearlyPrincipal),
        interest: Math.round(yearlyInterest),
        balance: Math.round(balance),
        totalPayment: Math.round(yearlyPrincipal + yearlyInterest),
      });
    }

    return schedule;
  }, [activeParams, monthlyPayment]);

  // Максимальные значения для слайдеров в зависимости от валюты
  const maxPropertyValue = useMemo(() => {
    switch (calculatorCurrency) {
      case "AMD": return 500000000; // 500M AMD
      case "EUR": return 1000000; // 1M EUR
      case "USD":
      default: return 2000000; // 2M USD
    }
  }, [calculatorCurrency]);

  const handleCurrencyChange = (newCurrency: string) => {
    setCalculatorCurrency(newCurrency as "USD" | "EUR" | "AMD");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6">
        {/* Заголовок */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("mortgage.title")}
          </h1>
          {!isMobile && (
            <p className="text-muted-foreground mt-2">
              {t("mortgage.description")}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Левая колонка - Параметры ввода */}
          <div className="space-y-6">
            {/* Валюта */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("mortgage.currencyLabel")}</CardTitle>
                {!isMobile && <CardDescription>{t("mortgage.currencyDescription")}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Select value={calculatorCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - {t("currency.usd")}</SelectItem>
                    <SelectItem value="EUR">EUR - {t("currency.eur")}</SelectItem>
                    <SelectItem value="AMD">AMD - {t("currency.amd")}</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Стоимость недвижимости и первоначальный взнос - объединенная карточка для мобильных */}
            {isMobile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("mortgage.propertyValue")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-muted-foreground leading-none">
                      {calculatorCurrency === "AMD" ? "" : (calculatorCurrency === "EUR" ? "€" : "$")}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {params.propertyValue.toLocaleString()}
                    </span>
                    {calculatorCurrency === "AMD" && (
                      <span className="text-2xl font-bold text-muted-foreground ml-1 leading-none">֏</span>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="ml-auto h-6 rounded-full px-2 text-xs"
                    >
                      ⓘ {downPaymentPercent.toFixed(1)}%
                    </Button>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-2">{t("mortgage.downPayment")}</div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-xl font-bold text-muted-foreground leading-none">
                        {calculatorCurrency === "AMD" ? "" : (calculatorCurrency === "EUR" ? "€" : "$")}
                      </span>
                      <span className="text-xl font-bold leading-none">
                        {params.downPayment.toLocaleString()}
                      </span>
                      {calculatorCurrency === "AMD" && (
                        <span className="text-xl font-bold text-muted-foreground ml-1 leading-none">֏</span>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="ml-auto h-6 rounded-full px-2 text-xs bg-black text-white hover:bg-black/90"
                      >
                        {downPaymentPercent.toFixed(0)}%
                      </Button>
                    </div>
                    <Slider
                      value={[downPaymentPercent]}
                      onValueChange={([value]) => updateDownPaymentByPercent(value)}
                      min={5}
                      max={90}
                      step={0.5}
                      className="mb-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5%</span>
                      <span>90%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Стоимость недвижимости */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("mortgage.propertyValue")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1 border-b pb-1 focus-within:border-primary transition-colors">
                      <span className="text-xl font-bold text-muted-foreground leading-none">
                        {calculatorCurrency === "AMD" ? "" : (calculatorCurrency === "EUR" ? "€" : "$")}
                      </span>
                      <Input
                        type="text"
                        value={params.propertyValue.toLocaleString()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setParams(prev => ({
                            ...prev,
                            propertyValue: Number(val) || 0
                          }));
                        }}
                        className="h-auto p-0 text-xl font-bold border-none bg-transparent focus-visible:ring-0 shadow-none leading-none"
                      />
                      {calculatorCurrency === "AMD" && (
                        <span className="text-xl font-bold text-muted-foreground ml-1 leading-none">֏</span>
                      )}
                    </div>
                    <Slider
                      value={[params.propertyValue]}
                      onValueChange={([value]) => setParams(prev => ({ ...prev, propertyValue: value }))}
                      min={10000}
                      max={maxPropertyValue}
                      step={calculatorCurrency === "AMD" ? 1000000 : 10000}
                    />
                  </CardContent>
                </Card>

                {/* Первоначальный взнос */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("mortgage.downPayment")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline gap-1 border-b pb-1 focus-within:border-primary transition-colors flex-1">
                        <span className="text-xl font-bold text-muted-foreground leading-none">
                          {calculatorCurrency === "AMD" ? "" : (calculatorCurrency === "EUR" ? "€" : "$")}
                        </span>
                        <Input
                          type="text"
                          value={params.downPayment.toLocaleString()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setParams(prev => ({
                              ...prev,
                              downPayment: Number(val) || 0
                            }));
                          }}
                          className="h-auto p-0 text-xl font-bold border-none bg-transparent focus-visible:ring-0 shadow-none leading-none"
                        />
                        {calculatorCurrency === "AMD" && (
                          <span className="text-xl font-bold text-muted-foreground ml-1 leading-none">֏</span>
                        )}
                      </div>
                      <span className="text-base text-muted-foreground whitespace-nowrap leading-none">
                        ({downPaymentPercent.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Slider
                        value={[downPaymentPercent]}
                        onValueChange={([value]) => updateDownPaymentByPercent(value)}
                        min={5}
                        max={90}
                        step={0.5}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Срок кредита и процентная ставка - в одну строку для мобильных */}
            {isMobile ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Срок кредита */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      {t("mortgage.loanTerm")}
                      <span className="text-xs">↗</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{params.loanTerm}</div>
                    <div className="text-xs text-muted-foreground">{t("mortgage.years")}</div>
                  </CardContent>
                </Card>

                {/* Процентная ставка */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {t("mortgage.interestRate")}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-5 rounded-full px-2 text-xs bg-black text-white hover:bg-black/90"
                      >
                        {downPaymentPercent.toFixed(0)}%
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">
                      {calculatorCurrency === "USD" ? "$" : calculatorCurrency === "EUR" ? "€" : ""}
                      {(monthlyPayment / 1000).toFixed(0)}k
                      {calculatorCurrency === "AMD" ? "֏" : ""}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {/* Срок кредита */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("mortgage.loanTerm")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={params.loanTerm.toString()}
                      onValueChange={(value) => setParams(prev => ({ ...prev, loanTerm: Number(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 {t("mortgage.years")}</SelectItem>
                        <SelectItem value="10">10 {t("mortgage.years")}</SelectItem>
                        <SelectItem value="15">15 {t("mortgage.years")}</SelectItem>
                        <SelectItem value="20">20 {t("mortgage.years")}</SelectItem>
                        <SelectItem value="25">25 {t("mortgage.years")}</SelectItem>
                        <SelectItem value="30">30 {t("mortgage.years")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Процентная ставка */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("mortgage.interestRate")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline gap-1 border-b pb-1 focus-within:border-primary transition-colors flex-1">
                        <span className="text-xl font-bold text-muted-foreground leading-none">%</span>
                        <Input
                          type="text"
                          value={params.interestRate.toFixed(1)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d.]/g, "");
                            setParams(prev => ({
                              ...prev,
                              interestRate: Number(val) || 0
                            }));
                          }}
                          className="h-auto p-0 text-xl font-bold border-none bg-transparent focus-visible:ring-0 shadow-none leading-none"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap leading-none">
                        {t("mortgage.fixedRate")}
                      </span>
                    </div>
                    <Slider
                      value={[params.interestRate]}
                      onValueChange={([value]) => setParams(prev => ({ ...prev, interestRate: value }))}
                      min={1}
                      max={15}
                      step={0.1}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {!isMobile && (
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleCalculate}
                  className="flex-1 h-12 text-lg font-semibold"
                  data-testid="button-calculate"
                >
                  {t("mortgage.calculate")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-12 px-6"
                  data-testid="button-reset"
                >
                  {t("mortgage.reset")}
                </Button>
              </div>
            )}

            {/* Результат для мобильных */}
            {isMobile && (
              <Card className="bg-black text-white border-black">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-white rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm">{t("mortgage.monthlyPayment")}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:bg-white/20"
                    >
                      <span className="text-lg">⋯</span>
                    </Button>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {formatCurrency(monthlyPayment, calculatorCurrency)}
                    </span>
                    <span className="text-sm text-white/70">/ {t("mortgage.perMonth")}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Правая колонка - Результаты */}
          {!isMobile && (
            <div className="space-y-6">
              {/* Ежемесячный платеж */}
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-2xl">{t("mortgage.monthlyPayment")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">
                    {formatCurrency(monthlyPayment, calculatorCurrency)}
                  </div>
                  <p className="text-sm mt-2 opacity-90">
                    {t("mortgage.perMonth")}
                  </p>
                </CardContent>
              </Card>

            {/* Сводная информация */}
            <Card>
              <CardHeader>
                <CardTitle>{t("mortgage.summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("mortgage.loanAmount")}:</span>
                  <span className="font-semibold">
                    {formatCurrency(params.propertyValue - params.downPayment, calculatorCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("mortgage.totalInterest")}:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      amortizationSchedule.reduce((sum, item) => sum + item.interest, 0),
                      calculatorCurrency
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground font-semibold">{t("mortgage.totalCost")}:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(
                      params.downPayment + amortizationSchedule.reduce((sum, item) => sum + item.totalPayment, 0),
                      calculatorCurrency
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* График погашения */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("mortgage.amortizationSchedule")}</CardTitle>
                <CardDescription>{t("mortgage.yearlyBreakdown")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartType === "area" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("area")}
                >
                  <LineChart className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "bar" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              {chartType === "area" ? (
                <AreaChart data={amortizationSchedule}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    label={{ value: t("mortgage.year"), position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, calculatorCurrency, { compact: true })}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, calculatorCurrency)}
                    labelFormatter={(label) => `${t("mortgage.year")} ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="principal"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    name={t("mortgage.principal")}
                  />
                  <Area
                    type="monotone"
                    dataKey="interest"
                    stackId="1"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    name={t("mortgage.interest")}
                  />
                </AreaChart>
              ) : (
                <BarChart data={amortizationSchedule}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    label={{ value: t("mortgage.year"), position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, calculatorCurrency, { compact: true })}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, calculatorCurrency)}
                    labelFormatter={(label) => `${t("mortgage.year")} ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="principal"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    name={t("mortgage.principal")}
                  />
                  <Bar
                    dataKey="interest"
                    stackId="a"
                    fill="hsl(var(--destructive))"
                    name={t("mortgage.interest")}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Таблица детализации */}
        <Card>
          <CardHeader>
            <CardTitle>{t("mortgage.detailedSchedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {amortizationSchedule.map((item) => (
                  <div
                    key={item.year}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">
                        {t("mortgage.year")} {item.year}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("mortgage.remainingBalance")}: {formatCurrency(item.balance, calculatorCurrency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(item.totalPayment, calculatorCurrency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(item.principal, calculatorCurrency)} + {formatCurrency(item.interest, calculatorCurrency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
