import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "completion_soonest", label: "Completion: Soonest" },
  { value: "name_asc", label: "Name: A to Z" },
];

interface MultiSelectProps {
  label: string;
  items: { id: number; name: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  testId: string;
}

function MultiSelect({ label, items, selectedIds, onChange, testId }: MultiSelectProps) {
  const { t } = useTranslation();
  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-auto min-h-9 justify-between gap-2"
          data-testid={testId}
        >
          <div className="flex flex-wrap gap-1">
            {selectedItems.length === 0 ? (
              <span className="text-muted-foreground">{label}</span>
            ) : (
              selectedItems.slice(0, 2).map((item) => (
                <Badge key={item.id} variant="secondary" className="text-xs">
                  {item.name}
                </Badge>
              ))
            )}
            {selectedItems.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedItems.length - 2}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-3 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${testId}-${item.id}`}
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                  data-testid={`checkbox-${testId}-${item.id}`}
                />
                <Label
                  htmlFor={`${testId}-${item.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  {item.name}
                </Label>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("common.noResults")}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
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

  // Temporary state for filters before applying
  const [tempCities, setTempCities] = useState<number[]>(selectedCities);
  const [tempDistricts, setTempDistricts] = useState<number[]>(selectedDistricts);
  const [tempDevelopers, setTempDevelopers] = useState<number[]>(selectedDevelopers);
  const [tempBanks, setTempBanks] = useState<number[]>(selectedBanks);

  // Update temp state when external props change (e.g., from clear all)
  useEffect(() => {
    setTempCities(selectedCities);
    setTempDistricts(selectedDistricts);
    setTempDevelopers(selectedDevelopers);
    setTempBanks(selectedBanks);
  }, [selectedCities, selectedDistricts, selectedDevelopers, selectedBanks]);

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
  const handleCityChange = (cityIds: number[]) => {
    setTempCities(cityIds);
    // Remove districts that are not in the selected cities
    if (cityIds.length > 0) {
      const validDistricts = districts
        .filter((d) => cityIds.includes(d.cityId))
        .map((d) => d.id);
      setTempDistricts(tempDistricts.filter((id) => validDistricts.includes(id)));
    }
  };

  // Check if there are any temporary filters selected
  const hasTempFilters =
    tempCities.length > 0 ||
    tempDistricts.length > 0 ||
    tempDevelopers.length > 0 ||
    tempBanks.length > 0;

  // Check if there are unapplied changes
  const hasUnappliedChanges =
    JSON.stringify(tempCities) !== JSON.stringify(selectedCities) ||
    JSON.stringify(tempDistricts) !== JSON.stringify(selectedDistricts) ||
    JSON.stringify(tempDevelopers) !== JSON.stringify(selectedDevelopers) ||
    JSON.stringify(tempBanks) !== JSON.stringify(selectedBanks);

  const handleApply = () => {
    onCitiesChange(tempCities);
    onDistrictsChange(tempDistricts);
    onDevelopersChange(tempDevelopers);
    onBanksChange(tempBanks);
  };

  const handleClearAll = () => {
    setTempCities([]);
    setTempDistricts([]);
    setTempDevelopers([]);
    setTempBanks([]);
    onClearAll();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-background">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>{t("filters.title")}:</span>
      </div>

      <MultiSelect
        label={t("filters.city")}
        items={cities}
        selectedIds={tempCities}
        onChange={handleCityChange}
        testId="filter-city"
      />

      <MultiSelect
        label={t("filters.district")}
        items={filteredDistricts}
        selectedIds={tempDistricts}
        onChange={setTempDistricts}
        testId="filter-district"
      />

      <MultiSelect
        label={t("filters.developer")}
        items={developers}
        selectedIds={tempDevelopers}
        onChange={setTempDevelopers}
        testId="filter-developer"
      />

      <MultiSelect
        label={t("filters.bank")}
        items={banks}
        selectedIds={tempBanks}
        onChange={setTempBanks}
        testId="filter-bank"
      />

      {/* Apply and Clear All buttons - only show when filters are selected */}
      {hasTempFilters && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleApply}
            disabled={!hasUnappliedChanges}
            className="text-muted-foreground"
            data-testid="button-apply-filters"
          >
            <Check className="h-4 w-4 mr-1" />
            {t("filters.apply") || "Apply"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground"
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-1" />
            {t("filters.clearFilters")}
          </Button>
        </>
      )}

      <div className="ml-auto">
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-48" data-testid="select-sort">
            <SelectValue placeholder={t("projects.sort.title")} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
