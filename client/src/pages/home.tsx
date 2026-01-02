import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilters, type SortOption } from "@/components/project-filters";
import { MiniMap } from "@/components/mini-map";
import { ProjectGridSkeleton, FiltersSkeleton, MapSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjectWithRelations, City, District, Developer, Bank } from "@shared/schema";

interface HomePageProps {
  searchQuery: string;
}

export default function HomePage({ searchQuery }: HomePageProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [selectedCities, setSelectedCities] = useState<number[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([]);
  const [selectedDevelopers, setSelectedDevelopers] = useState<number[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: cities = [], isLoading: citiesLoading } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const { data: districts = [], isLoading: districtsLoading } = useQuery<District[]>({
    queryKey: ["/api/districts"],
  });

  const { data: developers = [], isLoading: developersLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: banks = [], isLoading: banksLoading } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: favorites = [] } = useQuery<{ projectId: number }[]>({
    queryKey: ["/api/me/favorites"],
    enabled: isAuthenticated,
  });

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.projectId)), [favorites]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    selectedCities.forEach(id => params.append("cityId", String(id)));
    selectedDistricts.forEach(id => params.append("districtId", String(id)));
    selectedDevelopers.forEach(id => params.append("developerId", String(id)));
    selectedBanks.forEach(id => params.append("bankId", String(id)));
    params.set("sort", sortBy);
    return params.toString();
  }, [searchQuery, selectedCities, selectedDistricts, selectedDevelopers, selectedBanks, sortBy]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/projects?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("POST", "/api/me/favorites", { projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: t("favorites.added") || "Added to favorites" });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/me/favorites/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: t("favorites.removed") || "Removed from favorites" });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const handleFavoriteToggle = (projectId: number) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (favoriteIds.has(projectId)) {
      removeFavoriteMutation.mutate(projectId);
    } else {
      addFavoriteMutation.mutate(projectId);
    }
  };

  const handleClearFilters = () => {
    setSelectedCities([]);
    setSelectedDistricts([]);
    setSelectedDevelopers([]);
    setSelectedBanks([]);
  };

  const handleMarkerClick = (projectId: number) => {
    setSelectedProjectId(projectId);
    navigate(`/projects/${projectId}`);
  };

  const filtersLoading = citiesLoading || districtsLoading || developersLoading || banksLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 h-[280px] border-b bg-background shrink-0">
        {projectsLoading ? (
          <MapSkeleton />
        ) : (
          <MiniMap
            projects={projects}
            selectedProjectId={selectedProjectId}
            onMarkerClick={handleMarkerClick}
            className="h-full"
          />
        )}
      </div>

      {filtersLoading ? (
        <FiltersSkeleton />
      ) : (
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
      )}

      <div className="flex-1 overflow-auto p-6">
        {projectsLoading ? (
          <ProjectGridSkeleton count={6} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="search"
            title={t("projects.noProjects")}
            description={t("projects.adjustFilters")}
            action={{
              label: t("filters.clearFilters"),
              onClick: handleClearFilters,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isFavorite={favoriteIds.has(project.id)}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
