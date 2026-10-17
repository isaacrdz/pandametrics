"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DASHBOARD_RANGE_KEYS,
  dashboardRangeDays,
  dashboardRangeHref,
  fromIsoDate,
  isIsoDate,
  toIsoDate,
  type DashboardRange,
  type DashboardRangeKey,
} from "@/lib/dashboard-range";

interface CollectionsToolbarProps {
  range: DashboardRange;
}

const FROM_ID = "dashboard-range-from";
const TO_ID = "dashboard-range-to";

// The dashboard's date range: calendar presets and a custom span of days, kept in the URL. Finding
// a survey is the command palette's job (⌘K). A menu rather than a select, so "Custom" can be
// picked again to change the days
export function CollectionsToolbar({ range }: CollectionsToolbarProps) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function apply(next: DashboardRange) {
    router.replace(dashboardRangeHref(pathname, next), { scroll: false });
  }

  function select(key: string) {
    const next = key as DashboardRangeKey;
    if (next === "custom") {
      // Start from the days on screen, so adjusting "last month" by a day is quick
      const days = dashboardRangeDays(range, new Date());
      setFrom(days.from);
      setTo(days.to);
      setCustomOpen(true);
      return;
    }
    apply({ key: next });
  }

  const complete = isIsoDate(from) && isIsoDate(to);
  const outOfOrder = complete && from > to;

  function submitCustom(event: React.FormEvent) {
    event.preventDefault();
    if (!complete || outOfOrder) return;
    setCustomOpen(false);
    apply({ key: "custom", from, to });
  }

  const label =
    range.key === "custom"
      ? format.dateTimeRange(fromIsoDate(range.from), fromIsoDate(range.to), {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : t(`range.${range.key}`);

  return (
    // Sizes follow the "Your surveys" section (@container/surveys), not the viewport
    <div className="flex w-full @md/surveys:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label={`${t("toolbar.range")}: ${label}`}
            className="h-11 w-full justify-start gap-2 rounded-full bg-card px-4 text-[0.95rem] font-medium shadow-xs @md/surveys:w-auto @md/surveys:min-w-48"
          >
            <CalendarIcon aria-hidden className="text-muted-foreground" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon aria-hidden className="ml-auto text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
          <DropdownMenuRadioGroup value={range.key} onValueChange={select}>
            {DASHBOARD_RANGE_KEYS.map((key) => (
              <DropdownMenuRadioItem
                key={key}
                value={key}
                // Radix skips onValueChange for the checked item; "Custom" must reopen the picker
                onSelect={key === "custom" && range.key === "custom" ? () => select("custom") : undefined}
                className="py-2 text-[0.95rem]"
              >
                {t(`range.${key}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitCustom} noValidate className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{t("range.dialog.title")}</DialogTitle>
              <DialogDescription>{t("range.dialog.description")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={outOfOrder}>
                <FieldLabel htmlFor={FROM_ID}>{t("range.dialog.from")}</FieldLabel>
                <Input
                  id={FROM_ID}
                  type="date"
                  required
                  value={from}
                  max={to || toIsoDate(new Date())}
                  onChange={(event) => setFrom(event.target.value)}
                  aria-invalid={outOfOrder}
                  aria-describedby={outOfOrder ? `${FROM_ID}-error` : undefined}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={TO_ID}>{t("range.dialog.to")}</FieldLabel>
                <Input
                  id={TO_ID}
                  type="date"
                  required
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </Field>
            </div>
            {outOfOrder && <FieldError id={`${FROM_ID}-error`}>{t("range.dialog.invalid")}</FieldError>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
                {t("range.dialog.cancel")}
              </Button>
              <Button type="submit" disabled={!complete || outOfOrder}>
                {t("range.dialog.apply")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
