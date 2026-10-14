"use client";

import { ChartColumnIcon, SparklesIcon, StarIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SECTION_IDS } from "@/components/landing/landing-links";
import { SectionHeading } from "@/components/landing/SectionHeading";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

function FeatureCard({ icon: Icon, title, text }: FeatureCardProps) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-card-border bg-accent/50 p-6">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="leading-relaxed text-muted-foreground">{text}</p>
    </li>
  );
}

export function FeaturesSection() {
  const t = useTranslations("landing.features");

  const features = [
    { icon: SparklesIcon, title: t("humanTitle"), text: t("humanText") },
    { icon: ChartColumnIcon, title: t("metricsTitle"), text: t("metricsText") },
    { icon: StarIcon, title: t("allTitle"), text: t("allText") },
  ];

  return (
    <section
      id={SECTION_IDS.features}
      aria-labelledby="features-title"
      className="scroll-mt-24 bg-card py-20 lg:py-24"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 md:px-8">
        <SectionHeading id="features-title" eyebrow={t("eyebrow")} title={t("title")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </ul>
      </div>
    </section>
  );
}
