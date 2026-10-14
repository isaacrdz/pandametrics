"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { DeleteSurveyDialog } from "@/components/surveys/form/DeleteSurveyDialog";
import type { SurveyActionsTarget } from "@/components/surveys/SurveyActionsMenu";
import { Button } from "@/components/ui/button";
import type { SurveyCardData } from "@/lib/dashboard";

interface SurveyGridProps {
  cards: SurveyCardData[];
  query: string;
  // Link that keeps the current range but drops the search
  clearSearchHref: string;
  activeCount: number;
  // A card left the grid (moved to draft or deleted) and took the focused menu with it
  onCardRemoved: () => void;
}

export function SurveyGrid({ cards, query, clearSearchHref, activeCount, onCardRemoved }: SurveyGridProps) {
  const t = useTranslations("dashboard.noResults");
  // Lives here and not in the card: the card unmounts when the dashboard refreshes after the delete
  const [deleteTarget, setDeleteTarget] = useState<SurveyActionsTarget | null>(null);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title={t("title")}
        description={t("description", { query })}
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={clearSearchHref}>{t("clear")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {cards.map((card) => (
          <SurveyCard
            key={card.survey.id}
            {...card}
            activeCount={activeCount}
            onDelete={setDeleteTarget}
            onRemoved={onCardRemoved}
          />
        ))}
      </div>
      {deleteTarget && (
        <DeleteSurveyDialog
          surveyId={deleteTarget.id}
          surveyName={deleteTarget.name}
          open
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          // Stay on the dashboard: the action refreshes it
          onDeleted={() => {
            setDeleteTarget(null);
            onCardRemoved();
          }}
        />
      )}
    </>
  );
}
