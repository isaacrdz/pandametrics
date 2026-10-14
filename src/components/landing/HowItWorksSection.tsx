"use client";

import { useTranslations } from "next-intl";
import { SECTION_IDS } from "@/components/landing/landing-links";
import { SectionHeading } from "@/components/landing/SectionHeading";

export function HowItWorksSection() {
  const t = useTranslations("landing.how");

  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <section
      id={SECTION_IDS.howItWorks}
      aria-labelledby="how-title"
      className="scroll-mt-24 py-20 lg:py-24"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 md:px-8">
        <SectionHeading id="how-title" eyebrow={t("eyebrow")} title={t("title")} />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6">
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-xl bg-accent font-mono text-sm font-bold text-accent-foreground"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
