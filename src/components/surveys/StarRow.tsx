import { StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface StarRowProps {
  filled: number;
  total?: number;
  showEmpty?: boolean;
  className?: string;
}

export function StarRow({ filled, total = 5, showEmpty = false, className }: StarRowProps) {
  const t = useTranslations("charts");
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
      <span className="sr-only">{t("stars", { count: filled })}</span>
    </span>
  );
}
