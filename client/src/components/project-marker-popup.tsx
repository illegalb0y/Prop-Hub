import type { ProjectWithRelations } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProjectMarkerPopupProps {
  project: ProjectWithRelations;
}

export function ProjectMarkerPopup({ project }: ProjectMarkerPopupProps) {
  const { toast } = useToast();
  
  const { data: favorites = [] } = useQuery<number[]>({
    queryKey: ["/api/me/favorites"],
  });

  const isFavorite = favorites.includes(project.id);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        isFavorite ? "DELETE" : "POST",
        `/api/me/favorites/${project.id}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/favorites"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: project.name,
      });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favoriteMutation.mutate();
  };

  return (
    <Card className="min-w-[180px] overflow-hidden border-none shadow-lg relative group">
      <Button
        variant="ghost"
        size="icon"
        className={`absolute right-1 bottom-1 z-10 h-8 w-8 rounded-full backdrop-blur-md transition-all duration-200 ${
          isFavorite
            ? "bg-destructive/90 text-white"
            : "bg-background/60 text-foreground hover:bg-background/80"
        }`}
        onClick={handleFavoriteClick}
        disabled={favoriteMutation.isPending}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      </Button>

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
        {project.priceFrom && (
          <p className="text-xs font-normal text-muted-foreground mt-1">
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
      </div>
    </Card>
  );
}
