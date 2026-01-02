import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, Clock, LogOut } from "lucide-react";
import type { ProjectWithRelations, ViewHistory } from "@shared/schema";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: favoriteProjects = [], isLoading: favoritesLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/me/favorites/projects"],
    enabled: isAuthenticated,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<(ViewHistory & { project: ProjectWithRelations })[]>({
    queryKey: ["/api/me/history"],
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/me/favorites/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites/projects"] });
      toast({ title: t("favorites.removed") || "Removed from favorites" });
    },
  });

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (authLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <ProjectGridSkeleton count={3} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.profileImageUrl ?? undefined} alt={user.firstName ?? "User"} />
            <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold" data-testid="text-user-fullname">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-muted-foreground" data-testid="text-user-email">
              {user.email}
            </p>
          </div>
          <Button variant="outline" onClick={() => logout()} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            {t("nav.logout")}
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="favorites" className="gap-2" data-testid="tab-favorites">
            <Heart className="h-4 w-4" />
            {t("nav.favorites")} ({favoriteProjects.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
            <Clock className="h-4 w-4" />
            {t("account.viewHistory")} ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-6">
          {favoritesLoading ? (
            <ProjectGridSkeleton count={3} />
          ) : favoriteProjects.length === 0 ? (
            <EmptyState
              icon="heart"
              title={t("favorites.empty")}
              description={t("favorites.emptyDescription")}
              action={{
                label: t("favorites.browseProjects"),
                onClick: () => navigate("/"),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isFavorite={true}
                  onFavoriteToggle={(id) => removeFavoriteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {historyLoading ? (
            <ProjectGridSkeleton count={3} />
          ) : history.length === 0 ? (
            <EmptyState
              icon="clock"
              title={t("account.noHistory")}
              description={t("favorites.emptyDescription")}
              action={{
                label: t("favorites.browseProjects"),
                onClick: () => navigate("/"),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item) => (
                <ProjectCard
                  key={item.id}
                  project={item.project}
                  showFavoriteButton={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
