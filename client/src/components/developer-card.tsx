import { Building2 } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DeveloperWithStats } from "@shared/schema";

interface DeveloperCardProps {
  developer: DeveloperWithStats;
}

export function DeveloperCard({ developer }: DeveloperCardProps) {
  return (
    <Link href={`/developers/${developer.id}`}>
      <Card
        className="group flex gap-4 p-4 transition-all duration-200 hover:shadow-lg cursor-pointer"
        data-testid={`card-developer-${developer.id}`}
      >
        <Avatar className="h-20 w-20 shrink-0 rounded-lg">
          <AvatarImage src={developer.logoUrl ?? undefined} alt={developer.name} />
          <AvatarFallback className="rounded-lg bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-heading text-lg font-semibold line-clamp-1"
              data-testid={`text-developer-name-${developer.id}`}
            >
              {developer.name}
            </h3>
            <Badge variant="secondary" className="shrink-0">
              {developer.projectCount} {developer.projectCount === 1 ? "project" : "projects"}
            </Badge>
          </div>

          {developer.description && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              data-testid={`text-developer-description-${developer.id}`}
            >
              {developer.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
