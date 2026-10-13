import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  hintTone?: "muted" | "success";
  icon: LucideIcon;
  highlighted?: boolean;
}

export function StatCard({
  label,
  value,
  suffix,
  hint,
  hintTone = "muted",
  icon: Icon,
  highlighted = false,
}: StatCardProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-6 md:p-7",
        highlighted
          ? "border-transparent bg-highlight text-highlight-foreground shadow-[0_18px_40px_-18px_var(--highlight)]"
          : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className={cn("text-sm", highlighted ? "text-highlight-foreground/85" : "text-muted-foreground")}>
          {label}
        </h2>
        <Icon
          aria-hidden
          className={cn("size-5", highlighted ? "text-highlight-foreground/85" : "text-muted-foreground")}
        />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight">{value}</span>
        {suffix && (
          <span className={cn("text-lg", highlighted ? "text-highlight-foreground/70" : "text-muted-foreground")}>
            {suffix}
          </span>
        )}
      </p>
      <p
        className={cn(
          "text-sm",
          highlighted && "text-highlight-foreground/85",
          !highlighted && hintTone === "success" && "text-success-foreground",
          !highlighted && hintTone === "muted" && "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </section>
  );
}
