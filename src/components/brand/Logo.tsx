import Image from "next/image";
import Link from "next/link";
import logoIcon from "@/assets/brand/logo-icon.webp";
import { cn } from "@/lib/utils";

// Brand name, the same in every language
export const BRAND_NAME = "Panda Metrics";

const SIZES = {
  sm: { tile: "size-10", text: "text-lg" },
  md: { tile: "size-11", text: "text-xl" },
};

interface LogoProps {
  href: string;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  className?: string;
  // Lets the sidebar shrink the tile and hide the wordmark when collapsed
  iconClassName?: string;
  wordmarkClassName?: string;
}

export function Logo({
  href,
  size = "sm",
  showWordmark = true,
  className,
  iconClassName,
  wordmarkClassName,
}: LogoProps) {
  const sizes = SIZES[size];

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-brand shadow-[0_8px_20px_-8px_var(--brand)]",
          sizes.tile,
          iconClassName,
        )}
      >
        {/* The wordmark is the accessible name; the image is only decorative next to it */}
        <Image
          src={logoIcon}
          alt={showWordmark ? "" : BRAND_NAME}
          fill
          sizes="48px"
          className="object-cover"
        />
      </span>
      {showWordmark && (
        <span className={cn("truncate font-bold text-foreground", sizes.text, wordmarkClassName)}>
          {BRAND_NAME}
        </span>
      )}
    </Link>
  );
}
