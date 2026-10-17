"use client";

import { useState } from "react";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { DeleteSurveyDialog } from "@/components/surveys/form/DeleteSurveyDialog";
import type { SurveyActionsTarget } from "@/components/surveys/SurveyActionsMenu";
import type { SurveyCardData } from "@/lib/dashboard";

interface SurveyGridProps {
  cards: SurveyCardData[];
  activeCount: number;
  // A card left the grid (moved to draft or deleted) and took the focused menu with it
  onCardRemoved: () => void;
}

export function SurveyGrid({ cards, activeCount, onCardRemoved }: SurveyGridProps) {
  // Lives here and not in the card: the card unmounts when the dashboard refreshes after the delete
  const [deleteTarget, setDeleteTarget] = useState<SurveyActionsTarget | null>(null);

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
