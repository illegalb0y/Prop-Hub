import { useQuery } from "@tanstack/react-query";
import { BankCard } from "@/components/bank-card";
import { BankGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import type { Bank } from "@shared/schema";

interface BanksPageProps {
  searchQuery: string;
}

export default function BanksPage({ searchQuery }: BanksPageProps) {
  const { data: banks = [], isLoading } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const filteredBanks = searchQuery
    ? banks.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : banks;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold" data-testid="text-page-title">
          Banks
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse banks and their developer partnerships
        </p>
      </div>

      {isLoading ? (
        <BankGridSkeleton count={6} />
      ) : filteredBanks.length === 0 ? (
        <EmptyState
          icon="building"
          title="No banks found"
          description={searchQuery ? "Try a different search term." : "No banks are available yet."}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredBanks.length} {filteredBanks.length === 1 ? "bank" : "banks"}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBanks.map((bank) => (
              <BankCard key={bank.id} bank={bank} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
