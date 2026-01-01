import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ProjectWithRelations } from "@shared/schema";

export default function FavoritesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: favoriteProjects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/me/favorites/projects"],
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/me/favorites/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites/projects"] });
      toast({ title: "Removed from favorites" });
    },
    onError: () => {
      toast({ title: "Failed to remove favorite", variant: "destructive" });
    },
  });

  const handleRemoveFavorite = (projectId: number) => {
    removeFavoriteMutation.mutate(projectId);
  };

  if (authLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <ProjectGridSkeleton count={3} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold" data-testid="text-page-title">
          My Favorites
        </h1>
        <p className="text-muted-foreground mt-1">
          Projects you've saved for later
        </p>
      </div>

      {isLoading ? (
        <ProjectGridSkeleton count={6} />
      ) : favoriteProjects.length === 0 ? (
        <EmptyState
          icon="heart"
          title="No favorites yet"
          description="Start exploring projects and save your favorites to see them here."
          action={{
            label: "Browse Projects",
            onClick: () => navigate("/"),
          }}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {favoriteProjects.length} {favoriteProjects.length === 1 ? "project" : "projects"} saved
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isFavorite={true}
                onFavoriteToggle={handleRemoveFavorite}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
