import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FullMap } from "@/components/full-map";
import { ProjectFilters, type SortOption } from "@/components/project-filters";
import { MapSkeleton, FiltersSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import type {
  ProjectWithRelations,
  City,
  District,
  Developer,
  Bank,
} from "@shared/schema";

interface MapPageProps {
  searchQuery: string;
}

export default function MapPage({ searchQuery }: MapPageProps) {
  const [selectedCities, setSelectedCities] = useState<number[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([]);
  const [selectedDevelopers, setSelectedDevelopers] = useState<number[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: cities = [] } = useQuery<City[]>({ queryKey: ["/api/cities"] });
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["/api/districts"],
  });
  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });
  const { data: banks = [] } = useQuery<Bank[]>({ queryKey: ["/api/banks"] });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    selectedCities.forEach((id) => params.append("cityId", String(id)));
    selectedDistricts.forEach((id) => params.append("districtId", String(id)));
    selectedDevelopers.forEach((id) =>
      params.append("developerId", String(id)),
    );
    selectedBanks.forEach((id) => params.append("bankId", String(id)));
    params.set("sort", sortBy);
    return params.toString();
  }, [
    searchQuery,
    selectedCities,
    selectedDistricts,
    selectedDevelopers,
    selectedBanks,
    sortBy,
  ]);

  const { data: projects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/projects?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const handleClearFilters = () => {
    setSelectedCities([]);
    setSelectedDistricts([]);
    setSelectedDevelopers([]);
    setSelectedBanks([]);
  };

  const hasFilters =
    selectedCities.length > 0 ||
    selectedDistricts.length > 0 ||
    selectedDevelopers.length > 0 ||
    selectedBanks.length > 0;

  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 z-10">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              className="shadow-lg font-mono"
              data-testid="button-open-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              filters
              {hasFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                  {selectedCities.length +
                    selectedDistricts.length +
                    selectedDevelopers.length +
                    selectedBanks.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>filters</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <ProjectFilters
                cities={cities}
                districts={districts}
                developers={developers}
                banks={banks}
                selectedCities={selectedCities}
                selectedDistricts={selectedDistricts}
                selectedDevelopers={selectedDevelopers}
                selectedBanks={selectedBanks}
                sortBy={sortBy}
                onCitiesChange={setSelectedCities}
                onDistrictsChange={setSelectedDistricts}
                onDevelopersChange={setSelectedDevelopers}
                onBanksChange={setSelectedBanks}
                onSortChange={setSortBy}
                onClearAll={handleClearFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
        <p className="text-sm font-medium">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>

      {isLoading ? <MapSkeleton /> : <FullMap projects={projects} />}
    </div>
  );
}
