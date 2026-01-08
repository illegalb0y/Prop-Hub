import type { ProjectWithRelations } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface ProjectMarkerPopupProps {
  project: ProjectWithRelations;
}

export function ProjectMarkerPopup({ project }: ProjectMarkerPopupProps) {
  return (
    <Card className="min-w-[180px] overflow-hidden border-none shadow-lg">
      {project.coverImageUrl && (
        <div className="h-24 w-full relative">
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-2 bg-background">
        <h3 className="font-semibold text-sm line-clamp-1">{project.name}</h3>
        {project.priceFrom && (
          <p className="text-xs font-medium text-muted-foreground mt-1">
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
