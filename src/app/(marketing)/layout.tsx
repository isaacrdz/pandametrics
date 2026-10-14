import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { SkipLink } from "@/components/landing/SkipLink";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-background">
      {/* Soft brand glow at the top left, as in the landing reference */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(55%_60%_at_12%_0%,color-mix(in_oklch,var(--brand)_22%,transparent),transparent)]"
      />
      <SkipLink />
      <LandingNav />
      <main id="content" className="relative flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
