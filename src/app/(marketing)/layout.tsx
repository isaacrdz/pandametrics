import { Suspense } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingSession } from "@/components/landing/LandingSession";
import { SkipLink } from "@/components/landing/SkipLink";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-background">
      {/* Soft brand glow at the top left, as in the landing reference */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(55%_60%_at_12%_0%,color-mix(in_oklch,var(--brand)_22%,transparent),transparent)]"
      />
      {/* The only request data on the landing: whether the account buttons say "Go to dashboard" */}
      <Suspense>
        <LandingSession />
      </Suspense>
      <SkipLink />
      <LandingNav />
      <main id="content" className="relative flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
