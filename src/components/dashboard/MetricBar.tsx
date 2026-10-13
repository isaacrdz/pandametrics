import type { CSSProperties } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetricBarProps {
  share: number;
  color: string;
  label: string;
  className?: string;
}

// The color comes from the answer option, so it is passed as a CSS custom property
export function MetricBar({ share, color, label, className }: MetricBarProps) {
  return (
    <Progress
      value={Math.round(share * 100)}
      aria-label={label}
      style={{ "--bar-color": color } as CSSProperties}
      className={cn(
        "h-2 bg-muted [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-(--bar-color) motion-reduce:[&>[data-slot=progress-indicator]]:transition-none",
        className,
      )}
    />
  );
}
