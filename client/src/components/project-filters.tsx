import { X, ChevronDown, Filter } from "lucide-react";
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
                No options available
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
  const filteredDistricts = selectedCities.length > 0
    ? districts.filter((d) => selectedCities.includes(d.cityId))
    : districts;

  const hasFilters =
    selectedCities.length > 0 ||
    selectedDistricts.length > 0 ||
    selectedDevelopers.length > 0 ||
    selectedBanks.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-background">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters:</span>
      </div>

      <MultiSelect
        label="City"
        items={cities}
        selectedIds={selectedCities}
        onChange={onCitiesChange}
        testId="filter-city"
      />

      <MultiSelect
        label="District"
        items={filteredDistricts}
        selectedIds={selectedDistricts}
        onChange={onDistrictsChange}
        testId="filter-district"
      />

      <MultiSelect
        label="Developer"
        items={developers}
        selectedIds={selectedDevelopers}
        onChange={onDevelopersChange}
        testId="filter-developer"
      />

      <MultiSelect
        label="Bank"
        items={banks}
        selectedIds={selectedBanks}
        onChange={onBanksChange}
        testId="filter-bank"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground"
          data-testid="button-clear-filters"
        >
          <X className="h-4 w-4 mr-1" />
          Clear all
        </Button>
      )}

      <div className="ml-auto">
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-48" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
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
