"use client";

import { ChevronDownIcon, ListFilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const FILTER_BUTTON_CLASS =
  "h-11 flex-1 gap-2 rounded-xl bg-card px-4 text-[0.95rem] font-normal @2xl:flex-none [&_svg:not([class*='size-'])]:size-4";

// Highlighted while the filter narrows the list
export const FILTER_ACTIVE_CLASS = "border-primary/60 text-primary hover:text-primary";

interface FilterMenuProps<T extends string> {
  label: string;
  // Accessible name of the trigger, including the current choice
  triggerLabel: string;
  options: readonly { value: T; label: string }[];
  value: T;
  // The value that shows every row; any other one highlights the trigger
  defaultValue: T;
  onChange: (value: T) => void;
}

// Single-choice filter (e.g. status) for a table toolbar
export function FilterMenu<T extends string>({
  label,
  triggerLabel,
  options,
  value,
  defaultValue,
  onChange,
}: FilterMenuProps<T>) {
  const current = options.find((option) => option.value === value);
  const isFiltered = value !== defaultValue;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={triggerLabel} className={cn(FILTER_BUTTON_CLASS, isFiltered && FILTER_ACTIVE_CLASS)}>
          <ListFilterIcon aria-hidden />
          {label}
          {isFiltered && current && <span className="font-semibold">· {current.label}</span>}
          <ChevronDownIcon aria-hidden className="ml-auto text-muted-foreground @2xl:ml-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(options.find((option) => option.value === next)?.value ?? defaultValue)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
