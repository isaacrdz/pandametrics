import type { Metadata, Viewport } from "next";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Hero } from "@/components/landing/Hero";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

// Server-rendered, so English (the language switch happens on the client)
export const metadata: Metadata = {
  title: "Panda Metrics: understand your customers",
  description: "Collect feedback by kiosk, link or QR and turn it into clear metrics.",
};

export const viewport: Viewport = {
  themeColor: "#db8396",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaBanner />
    </>
  );
}
