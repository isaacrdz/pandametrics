import Image from "next/image";
import Link from "next/link";
import logoMark from "@/assets/brand/logo.svg";
import { cn } from "@/lib/utils";

// Brand name, the same in every language
export const BRAND_NAME = "Panda Metrics";

const SIZES = {
  sm: { icon: "size-10", text: "text-lg" },
  md: { icon: "size-11", text: "text-xl" },
};

interface LogoProps {
  href: string;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  className?: string;
  // Lets the sidebar adjust the icon and hide the wordmark when collapsed
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
      <span className={cn("relative shrink-0", sizes.icon, iconClassName)}>
        {/* The wordmark is the accessible name; the image is only decorative next to it.
            SVG sources are served as is (Next skips optimization for .svg) */}
        <Image src={logoMark} alt={showWordmark ? "" : BRAND_NAME} fill sizes="48px" className="object-contain" />
      </span>
      {showWordmark && (
        <span className={cn("truncate font-bold text-foreground", sizes.text, wordmarkClassName)}>
          {BRAND_NAME}
        </span>
      )}
    </Link>
  );
}
