import { Landmark } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Bank } from "@shared/schema";

interface BankCardProps {
  bank: Bank & { developerCount?: number };
}

export function BankCard({ bank }: BankCardProps) {
  return (
    <Link href={`/banks/${bank.id}`}>
      <Card
        className="group flex gap-4 p-4 transition-all duration-200 hover:shadow-lg cursor-pointer"
        data-testid={`card-bank-${bank.id}`}
      >
        <Avatar className="h-20 w-20 shrink-0 rounded-lg">
          <AvatarImage src={bank.logoUrl ?? undefined} alt={bank.name} />
          <AvatarFallback className="rounded-lg bg-muted">
            <Landmark className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <h3
            className="font-heading text-lg font-semibold line-clamp-1"
            data-testid={`text-bank-name-${bank.id}`}
          >
            {bank.name}
          </h3>

          {bank.description && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              data-testid={`text-bank-description-${bank.id}`}
            >
              {bank.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
