import { useRef, useEffect, useCallback } from "react";
import type { ProjectWithRelations } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ProjectMarkerPopupProps {
  project: ProjectWithRelations;
  showFavoriteButton?: boolean;
}

export function ProjectMarkerPopup({
  project,
  showFavoriteButton = true,
}: ProjectMarkerPopupProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: favorites = [] } = useQuery<number[]>({
    queryKey: ["/api/me/favorites"],
    enabled: isAuthenticated,
  });

  const isFavorite = favorites.includes(project.id);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/me/favorites/${project.id}`);
      } else {
        await apiRequest("POST", "/api/me/favorites", { projectId: project.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: project.name,
      });
    },
    onError: (error: Error) => {
      console.error("Favorite mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteAction = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    favoriteMutation.mutate();
  }, [isAuthenticated, favoriteMutation]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFavoriteAction();
    };

    button.addEventListener("click", handleClick, true);
    return () => {
      button.removeEventListener("click", handleClick, true);
    };
  }, [handleFavoriteAction]);

  return (
    <Card className="min-w-[180px] overflow-hidden border-none shadow-lg relative group">
      {project.coverImageUrl && (
        <div className="h-24 w-full relative">
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-2 bg-background font-mono">
        <h3 className="font-bold text-sm line-clamp-1">{project.name}</h3>
        <div className="flex items-center justify-between mt-1 gap-1">
          {project.priceFrom && (
            <p className="text-xs font-normal text-muted-foreground truncate flex-1">
              from{" "}
              <span className="text-foreground">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: project.currency || "USD",
                  maximumFractionDigits: 0,
                }).format(project.priceFrom)}
              </span>
            </p>
          )}
          {showFavoriteButton && (
            <Button
              ref={buttonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-transparent shrink-0"
              disabled={favoriteMutation.isPending}
              data-favorite-button="true"
            >
              <Heart
                className={`h-4 w-4 transition-colors duration-200 heart-shake-hover ${
                  isFavorite
                    ? "fill-destructive text-destructive"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
