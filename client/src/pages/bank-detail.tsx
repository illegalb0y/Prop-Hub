import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Landmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeveloperCard } from "@/components/developer-card";
import { DeveloperGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bank, DeveloperWithStats } from "@shared/schema";

export default function BankDetailPage() {
  const [match, params] = useRoute("/banks/:id");
  const bankId = params?.id ? parseInt(params.id) : null;

  const { data: bank, isLoading: bankLoading } = useQuery<Bank>({
    queryKey: ["/api/banks", bankId],
    queryFn: async () => {
      const res = await fetch(`/api/banks/${bankId}`);
      if (!res.ok) throw new Error("Failed to fetch bank");
      return res.json();
    },
    enabled: !!bankId,
  });

  const { data: developers = [], isLoading: developersLoading } = useQuery<DeveloperWithStats[]>({
    queryKey: ["/api/banks", bankId, "developers"],
    queryFn: async () => {
      const res = await fetch(`/api/banks/${bankId}/developers`);
      if (!res.ok) throw new Error("Failed to fetch developers");
      return res.json();
    },
    enabled: !!bankId,
  });

  if (bankLoading) {
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
        <DeveloperGridSkeleton count={4} />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="p-6">
        <EmptyState
          icon="error"
          title="Bank not found"
          description="The bank you're looking for doesn't exist."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/banks" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/banks" className="hover:underline">Banks</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{bank.name}</span>
        </nav>
      </div>

      <div className="flex items-start gap-6">
        <Avatar className="h-24 w-24 rounded-lg shrink-0">
          <AvatarImage src={bank.logoUrl ?? undefined} alt={bank.name} />
          <AvatarFallback className="rounded-lg">
            <Landmark className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold" data-testid="text-bank-name">
            {bank.name}
          </h1>
          {bank.description && (
            <p className="text-muted-foreground mt-2">{bank.description}</p>
          )}
          {bank.website && (
            <div className="mt-3">
              <a
                href={bank.website}
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
        <h2 className="font-heading text-xl font-semibold mb-4">Partner Developers</h2>
        {developersLoading ? (
          <DeveloperGridSkeleton count={4} />
        ) : developers.length === 0 ? (
          <EmptyState
            icon="building"
            title="No partners yet"
            description="This bank hasn't partnered with any developers yet."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {developers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
