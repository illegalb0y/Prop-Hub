import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DeveloperCard } from "@/components/developer-card";
import { DeveloperGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import type { DeveloperWithStats } from "@shared/schema";

interface DevelopersPageProps {
  searchQuery: string;
}

export default function DevelopersPage({ searchQuery }: DevelopersPageProps) {
  const { t } = useTranslation();
  const { data: developers = [], isLoading } = useQuery<DeveloperWithStats[]>({
    queryKey: ["/api/developers"],
  });

  const filteredDevelopers = searchQuery
    ? developers.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : developers;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold" data-testid="text-page-title">
          {t("developers.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("developers.projectCount", { count: filteredDevelopers.length })}
        </p>
      </div>

      {isLoading ? (
        <DeveloperGridSkeleton count={6} />
      ) : filteredDevelopers.length === 0 ? (
        <EmptyState
          icon="building"
          title={t("developers.noDevelopers")}
          description={t("common.tryClearing")}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {t("developers.projectCount", { count: filteredDevelopers.length })}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDevelopers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
