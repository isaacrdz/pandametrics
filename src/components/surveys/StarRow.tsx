import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRowProps {
  filled: number;
  total?: number;
  showEmpty?: boolean;
  className?: string;
}

export function StarRow({ filled, total = 5, showEmpty = false, className }: StarRowProps) {
  const count = showEmpty ? total : filled;

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: count }, (_, i) => (
        <StarIcon
          key={i}
          aria-hidden
          className={cn("size-4 fill-current", i < filled ? "text-star" : "text-star-empty")}
        />
      ))}
      <span className="sr-only">{filled === 1 ? "1 estrella" : `${filled} estrellas`}</span>
    </span>
  );
}
