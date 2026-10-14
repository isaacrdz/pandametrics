"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CopyIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setSurveyActive } from "@/actions/surveys";
import { useCopyToClipboard } from "@/components/dashboard/CopyButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACTIVE_SURVEY_LIMIT } from "@/lib/surveys/constants";
import type { SurveyRow } from "@/lib/surveys/list";

interface SurveyRowMenuProps {
  row: SurveyRow;
  activeCount: number;
  onDelete: (row: SurveyRow) => void;
}

export function SurveyRowMenu({ row, activeCount, onDelete }: SurveyRowMenuProps) {
  const t = useTranslations("surveys");
  const tErrors = useTranslations("surveyForm.errors");
  const tCard = useTranslations("surveyCard");
  const tResults = useTranslations("results");
  const copy = useCopyToClipboard();
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    const next = !row.isActive;
    startTransition(async () => {
      // The server is the authority on the limit: the hint below can be outdated
      const result = await setSurveyActive(row.id, next);
      if (!result.success) {
        toast.error(tErrors(result.error.code, { limit: ACTIVE_SURVEY_LIMIT }));
        return;
      }
      toast.success(t(next ? "toasts.activated" : "toasts.deactivated"), { description: row.name });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label={t("actions.label", { name: row.name })}
          className="size-9 rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <MoreHorizontalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
        <DropdownMenuItem asChild>
          <Link href={`/surveys/${row.id}`}>
            <PencilIcon aria-hidden />
            {t("actions.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(row.publicUrl, tCard("linkCopied"))}>
          <LinkIcon aria-hidden />
          {t("actions.copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(row.code, tResults("codeCopied"))}>
          <CopyIcon aria-hidden />
          {t("actions.copyCode")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleActive}>
          {row.isActive ? <CircleDashedIcon aria-hidden /> : <CircleCheckIcon aria-hidden />}
          {t(row.isActive ? "actions.deactivate" : "actions.activate")}
        </DropdownMenuItem>
        {!row.isActive && (
          <DropdownMenuLabel className="pt-0 pl-8 text-xs font-normal text-muted-foreground">
            {t("actions.activeCount", { count: activeCount, limit: ACTIVE_SURVEY_LIMIT })}
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row)}>
          <Trash2Icon aria-hidden />
          {t("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
