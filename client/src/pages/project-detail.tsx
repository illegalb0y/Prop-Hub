import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Heart, MapPin, Calendar, Building2, Landmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ProjectWithRelations, Bank } from "@shared/schema";

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const [match, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: project, isLoading, error } = useQuery<ProjectWithRelations>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: favorites = [] } = useQuery<{ projectId: number }[]>({
    queryKey: ["/api/me/favorites"],
    enabled: isAuthenticated,
  });

  const isFavorite = favorites.some(f => f.projectId === projectId);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/me/favorites", { projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: t("favorites.added") });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/me/favorites/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({ title: t("favorites.removed") });
    },
  });

  useEffect(() => {
    if (isAuthenticated && projectId) {
      apiRequest("POST", "/api/me/history", { projectId, source: "listing_card" }).catch(() => {});
    }
  }, [isAuthenticated, projectId]);

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <EmptyState
          icon="error"
          title={t("projects.noProjects")}
          description={t("projects.adjustFilters")}
        />
      </div>
    );
  }

  const formattedPrice = project.priceFrom
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: project.currency || "USD",
        maximumFractionDigits: 0,
      }).format(project.priceFrom)
    : null;

  const formattedDate = project.completionDate
    ? format(new Date(project.completionDate), "MMMM yyyy")
    : null;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">{t("nav.home")}</Link>
            <span className="mx-2">/</span>
            <Link href="/projects" className="hover:underline">{t("nav.projects")}</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{project.name}</span>
          </nav>
        </div>

        <div className="relative aspect-[16/9] max-h-[480px] overflow-hidden rounded-xl bg-muted">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="h-24 w-24 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-heading text-3xl font-bold" data-testid="text-project-title">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{project.address || `${project.district?.name}, ${project.city?.name}`}</span>
                </div>
                {formattedDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{t("projects.completionDate")}: {formattedDate}</span>
                  </div>
                )}
              </div>
            </div>

            {formattedPrice && (
              <div>
                <p className="text-sm text-muted-foreground">{t("projects.priceFrom")}</p>
                <p className="text-3xl font-bold" data-testid="text-project-price">
                  {formattedPrice}
                </p>
              </div>
            )}

            {project.description && (
              <div>
                <h2 className="font-heading text-xl font-semibold mb-3">{t("common.description")}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </div>
            )}

            {project.banks && project.banks.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold mb-3">{t("banks.partnerDevelopers")}</h2>
                <div className="flex flex-wrap gap-2">
                  {project.banks.map((bank: Bank) => (
                    <Link key={bank.id} href={`/banks/${bank.id}`}>
                      <Badge variant="secondary" className="cursor-pointer gap-2 py-2 px-3">
                        <Landmark className="h-3 w-3" />
                        {bank.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full font-medium bg-[#003630] text-primary-foreground border border-primary-border"
              variant={isFavorite ? "destructive" : "default"}
              onClick={handleFavoriteToggle}
              disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
              data-testid="button-toggle-favorite"
            >
              <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? t("favorites.removed") : t("favorites.added")}
            </Button>

            <Card className="p-4 space-y-4">
              <h3 className="font-heading font-semibold">{t("filters.developer")}</h3>
              <Link href={`/developers/${project.developer?.id}`}>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={project.developer?.logoUrl ?? undefined} />
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" data-testid="text-developer-name">
                      {project.developer?.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {t("projects.viewDetails")} <ExternalLink className="h-3 w-3" />
                    </p>
                  </div>
                </div>
              </Link>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="font-heading font-semibold">{t("map.location")}</h3>
              <p className="text-sm text-muted-foreground">
                {project.district?.name}, {project.city?.name}
              </p>
              {project.address && (
                <p className="text-sm text-muted-foreground">{project.address}</p>
              )}
              {project.website && (
                <div className="pt-2">
                  <a
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("common.website")}
                  </a>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
