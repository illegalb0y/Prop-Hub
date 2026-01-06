import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Developer, ProjectWithRelations } from "@shared/schema";

export default function DeveloperDetailPage() {
  const [match, params] = useRoute("/developers/:id");
  const developerId = params?.id ? parseInt(params.id) : null;
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: developer, isLoading: developerLoading } = useQuery<Developer>({
    queryKey: ["/api/developers", developerId],
    queryFn: async () => {
      const res = await fetch(`/api/developers/${developerId}`);
      if (!res.ok) throw new Error("Failed to fetch developer");
      return res.json();
    },
    enabled: !!developerId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects", `developerId=${developerId}`],
    queryFn: async () => {
      const res = await fetch(`/api/projects?developerId=${developerId}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!developerId,
  });

  const { data: favorites = [] } = useQuery<{ projectId: number }[]>({
    queryKey: ["/api/me/favorites"],
    enabled: isAuthenticated,
  });

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.projectId)), [favorites]);

  const addFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => apiRequest("POST", "/api/me/favorites", { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: "Added to favorites" });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => apiRequest("DELETE", `/api/me/favorites/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: "Removed from favorites" });
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

  if (developerLoading) {
    return (
      <div className="h-full overflow-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <ProjectGridSkeleton count={3} />
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="p-6">
        <EmptyState
          icon="error"
          title="Developer not found"
          description="The developer you're looking for doesn't exist."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/developers" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/developers" className="hover:underline">Developers</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{developer.name}</span>
        </nav>
      </div>

      <div className="flex items-start gap-6">
        <Avatar className="h-24 w-24 rounded-lg shrink-0">
          <AvatarImage src={developer.logoUrl ?? undefined} alt={developer.name} />
          <AvatarFallback className="rounded-lg">
            <Building2 className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold" data-testid="text-developer-name">
              {developer.name}
            </h1>
            <Badge variant="secondary">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </Badge>
          </div>
          {developer.description && (
            <p className="text-muted-foreground mt-2">{developer.description}</p>
          )}
          {developer.website && (
            <div className="mt-3">
              <a
                href={developer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Website
              </a>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl font-semibold mb-4">Projects by {developer.name}</h2>
        {projectsLoading ? (
          <ProjectGridSkeleton count={3} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="building"
            title="No projects yet"
            description="This developer hasn't published any projects yet."
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
