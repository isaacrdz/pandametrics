"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Organization } from "@/types/survey";

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentId: string;
}

export function OrganizationSwitcher({ organizations, currentId }: OrganizationSwitcherProps) {
  const t = useTranslations("topBar");
  // Local only until organizations come from the session
  const [selectedId, setSelectedId] = useState(currentId);
  const selected = organizations.find((o) => o.id === selectedId) ?? organizations[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={t("organizationLabel", { name: selected.name })}
          className="h-11 gap-2 rounded-full bg-card px-4 text-[0.95rem] font-normal shadow-xs"
        >
          <span aria-hidden className="size-2.5 rounded-full bg-success" />
          <span className="hidden max-w-40 truncate @3xl:inline">{selected.name}</span>
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
        <DropdownMenuLabel>{t("organizations")}</DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem key={organization.id} onSelect={() => setSelectedId(organization.id)}>
            {organization.name}
            {organization.id === selected.id && <CheckIcon aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
