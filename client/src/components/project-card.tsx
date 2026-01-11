import { Heart, MapPin, Calendar, Building2 } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { useCurrency } from "@/lib/currency-provider";
import type { SupportedCurrency } from "@/lib/currency";

interface ProjectCardProps {
  project: ProjectWithRelations;
  onFavoriteToggle?: (projectId: number) => void;
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
}

export function ProjectCard({
  project,
  onFavoriteToggle,
  isFavorite = false,
  showFavoriteButton = true,
}: ProjectCardProps) {
  const { formatPrice } = useCurrency();

  const formattedPrice = project.priceFrom
    ? formatPrice(project.priceFrom, (project.currency as SupportedCurrency) || "USD")
    : null;

  const formattedDate = project.completionDate
    ? format(new Date(project.completionDate), "MMM yyyy")
    : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(project.id);
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <Card
        className="group overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer"
        data-testid={`card-project-${project.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}

          {showFavoriteButton && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-2 top-2 h-9 w-9 rounded-full backdrop-blur-md ${
                isFavorite
                  ? "bg-destructive/90 text-white"
                  : "bg-background/80 text-foreground"
              }`}
              onClick={handleFavoriteClick}
              data-testid={`button-favorite-${project.id}`}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          )}

          {formattedDate && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 left-2 backdrop-blur-md bg-background/80"
            >
              <Calendar className="mr-1 h-3 w-3" />
              {formattedDate}
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-heading text-lg font-semibold line-clamp-1"
              data-testid={`text-project-name-${project.id}`}
            >
              {project.name}
            </h3>
          </div>

          {formattedPrice && (
            <p
              className="text-xl font-semibold text-foreground"
              data-testid={`text-project-price-${project.id}`}
            >
              From {formattedPrice}
            </p>
          )}

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1" data-testid={`text-project-location-${project.id}`}>
              {project.district?.name}, {project.city?.name}
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1" data-testid={`text-project-developer-${project.id}`}>
              {project.developer?.name}
            </span>
          </div>

          {project.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.shortDescription}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
