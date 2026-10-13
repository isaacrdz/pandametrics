import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { Button } from "@/components/ui/button";
import type { SurveyCardData } from "@/lib/dashboard";

const COPY = {
  noResultsTitle: "No hay encuestas que coincidan",
  clearSearch: "Limpiar búsqueda",
};

interface SurveyGridProps {
  cards: SurveyCardData[];
  query: string;
  // Link that keeps the current range but drops the search
  clearSearchHref: string;
}

export function SurveyGrid({ cards, query, clearSearchHref }: SurveyGridProps) {
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title={COPY.noResultsTitle}
        description={`No encontramos encuestas activas con «${query}» en el nombre o el código.`}
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={clearSearchHref}>{COPY.clearSearch}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {cards.map((card) => (
        <SurveyCard key={card.survey.id} {...card} />
      ))}
    </div>
  );
}
