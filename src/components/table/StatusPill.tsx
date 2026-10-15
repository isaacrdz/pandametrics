import { cn } from "@/lib/utils";

interface StatusPillProps {
  tone: "success" | "muted";
  label: string;
}

// Success: success-foreground on success/10 over the card measures 4.74:1 light, 8.0:1 dark
// (alpha mixes are not read by check-contrast.mjs). Muted uses the checked muted pair.
export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        tone === "success" ? "bg-success/10 text-success-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone === "success" ? "bg-success" : "bg-muted-foreground/60")} />
      {label}
    </span>
  );
}
