import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { City, District, Developer, Bank } from "@shared/schema";

export type SortOption = "newest" | "price_asc" | "price_desc" | "completion_soonest" | "name_asc";

interface ProjectFiltersProps {
  cities: City[];
  districts: District[];
  developers: Developer[];
  banks: Bank[];
  selectedCities: number[];
  selectedDistricts: number[];
  selectedDevelopers: number[];
  selectedBanks: number[];
  sortBy: SortOption;
  onCitiesChange: (ids: number[]) => void;
  onDistrictsChange: (ids: number[]) => void;
  onDevelopersChange: (ids: number[]) => void;
  onBanksChange: (ids: number[]) => void;
  onSortChange: (sort: SortOption) => void;
  onClearAll: () => void;
}

export function ProjectFilters({
  cities,
  districts,
  developers,
  banks,
  selectedCities,
  selectedDistricts,
  selectedDevelopers,
  selectedBanks,
  sortBy,
  onCitiesChange,
  onDistrictsChange,
  onDevelopersChange,
  onBanksChange,
  onSortChange,
  onClearAll,
}: ProjectFiltersProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Temporary state for filters before applying
  const [tempCities, setTempCities] = useState<number[]>(selectedCities);
  const [tempDistricts, setTempDistricts] = useState<number[]>(selectedDistricts);
  const [tempDevelopers, setTempDevelopers] = useState<number[]>(selectedDevelopers);
  const [tempBanks, setTempBanks] = useState<number[]>(selectedBanks);
  const [tempSort, setTempSort] = useState<SortOption>(sortBy);

  // Update temp state when external props change
  useEffect(() => {
    setTempCities(selectedCities);
    setTempDistricts(selectedDistricts);
    setTempDevelopers(selectedDevelopers);
    setTempBanks(selectedBanks);
    setTempSort(sortBy);
  }, [selectedCities, selectedDistricts, selectedDevelopers, selectedBanks, sortBy]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: t("projects.sort.newest") },
    { value: "price_asc", label: t("projects.sort.priceAsc") },
    { value: "price_desc", label: t("projects.sort.priceDesc") },
    { value: "completion_soonest", label: t("projects.sort.completion") },
    { value: "name_asc", label: t("projects.sort.nameAsc") },
  ];

  // Filter districts based on selected cities in temporary state
  const filteredDistricts = tempCities.length > 0
    ? districts.filter((d) => tempCities.includes(d.cityId))
    : districts;

  // When city changes, remove districts that don't belong to selected cities
  const handleCityToggle = (cityId: number) => {
    const newCities = tempCities.includes(cityId)
      ? tempCities.filter((id) => id !== cityId)
      : [...tempCities, cityId];

    setTempCities(newCities);

    // Remove districts that are not in the selected cities
    if (newCities.length > 0) {
      const validDistricts = districts
        .filter((d) => newCities.includes(d.cityId))
        .map((d) => d.id);
      setTempDistricts(tempDistricts.filter((id) => validDistricts.includes(id)));
    }
  };

  const handleDistrictToggle = (districtId: number) => {
    setTempDistricts(
      tempDistricts.includes(districtId)
        ? tempDistricts.filter((id) => id !== districtId)
        : [...tempDistricts, districtId]
    );
  };

  const handleDeveloperToggle = (developerId: number) => {
    setTempDevelopers(
      tempDevelopers.includes(developerId)
        ? tempDevelopers.filter((id) => id !== developerId)
        : [...tempDevelopers, developerId]
    );
  };

  const handleBankToggle = (bankId: number) => {
    setTempBanks(
      tempBanks.includes(bankId)
        ? tempBanks.filter((id) => id !== bankId)
        : [...tempBanks, bankId]
    );
  };

  const handleApply = () => {
    onCitiesChange(tempCities);
    onDistrictsChange(tempDistricts);
    onDevelopersChange(tempDevelopers);
    onBanksChange(tempBanks);
    onSortChange(tempSort);
    setOpen(false);
  };

  const handleClearAll = () => {
    setTempCities([]);
    setTempDistricts([]);
    setTempDevelopers([]);
    setTempBanks([]);
    setTempSort("newest");
  };

  const hasActiveFilters =
    selectedCities.length > 0 ||
    selectedDistricts.length > 0 ||
    selectedDevelopers.length > 0 ||
    selectedBanks.length > 0;

  const activeFiltersCount =
    selectedCities.length +
    selectedDistricts.length +
    selectedDevelopers.length +
    selectedBanks.length;

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {hasActiveFilters && (
              <span className="font-medium text-foreground">
                {activeFiltersCount} {t("filters.activeFilters")}
              </span>
            )}
          </span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="gap-2"
            data-testid="button-filter-sort"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("filters.filterAndSort")}
          </Button>

          <SheetContent className="w-full sm:max-w-md p-0 flex flex-col !z-[9999]">
            <SheetHeader className="px-6 py-5 border-b flex-row items-center justify-between space-y-0">
              <SheetTitle className="text-2xl font-bold uppercase tracking-tight">
                {t("filters.filterAndSort")}
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-transparent">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="py-6 space-y-6">
                {/* Sort Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                    {t("projects.sort.title")}
                  </h3>
                  <RadioGroup
                    value={tempSort}
                    onValueChange={(value) => setTempSort(value as SortOption)}
                  >
                    {sortOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-3">
                        <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                        <Label
                          htmlFor={`sort-${option.value}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* City Filter */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                    {t("filters.city")} {tempCities.length > 0 && `(${tempCities.length})`}
                  </h3>
                  <ScrollArea className="max-h-[200px] border border-border/40 rounded-md">
                    <div className="space-y-3 p-3">
                      {cities.map((city) => (
                        <div key={city.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`city-${city.id}`}
                            checked={tempCities.includes(city.id)}
                            onCheckedChange={() => handleCityToggle(city.id)}
                          />
                          <Label
                            htmlFor={`city-${city.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {city.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* District Filter */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                    {t("filters.district")} {tempDistricts.length > 0 && `(${tempDistricts.length})`}
                  </h3>
                  <ScrollArea 
                    className="max-h-[200px] border border-border/40 rounded-md"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3 p-3">
                      {filteredDistricts.length > 0 ? (
                        filteredDistricts.map((district) => (
                          <div key={district.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={`district-${district.id}`}
                              checked={tempDistricts.includes(district.id)}
                              onCheckedChange={() => handleDistrictToggle(district.id)}
                            />
                            <Label
                              htmlFor={`district-${district.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {district.name}
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {tempCities.length > 0
                            ? t("common.noResults")
                            : t("filters.selectCityFirst")}
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Developer Filter */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                    {t("filters.developer")} {tempDevelopers.length > 0 && `(${tempDevelopers.length})`}
                  </h3>
                  <ScrollArea 
                    className="max-h-[200px] border border-border/40 rounded-md"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3 p-3">
                      {developers.map((developer) => (
                        <div key={developer.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`developer-${developer.id}`}
                            checked={tempDevelopers.includes(developer.id)}
                            onCheckedChange={() => handleDeveloperToggle(developer.id)}
                          />
                          <Label
                            htmlFor={`developer-${developer.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {developer.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Bank Filter */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                    {t("filters.bank")} {tempBanks.length > 0 && `(${tempBanks.length})`}
                  </h3>
                  <ScrollArea 
                    className="max-h-[200px] border border-border/40 rounded-md"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3 p-3">
                      {banks.map((bank) => (
                        <div key={bank.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`bank-${bank.id}`}
                            checked={tempBanks.includes(bank.id)}
                            onCheckedChange={() => handleBankToggle(bank.id)}
                          />
                          <Label
                            htmlFor={`bank-${bank.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {bank.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with buttons */}
            <div className="border-t p-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="flex-1 uppercase font-semibold"
                  size="lg"
                  data-testid="button-clear-filters"
                >
                  {t("filters.clearFilters")}
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1 uppercase font-semibold"
                  size="lg"
                  data-testid="button-apply-filters"
                >
                  {t("filters.apply")}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
