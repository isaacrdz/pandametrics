"use client";

import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { Button } from "@/components/ui/button";
import type { SurveyCardData } from "@/lib/dashboard";

interface SurveyGridProps {
  cards: SurveyCardData[];
  query: string;
  // Link that keeps the current range but drops the search
  clearSearchHref: string;
}

export function SurveyGrid({ cards, query, clearSearchHref }: SurveyGridProps) {
  const t = useTranslations("dashboard.noResults");

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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {cards.map((card) => (
        <SurveyCard key={card.survey.id} {...card} />
      ))}
    </div>
  );
}
