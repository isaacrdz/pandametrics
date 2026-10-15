"use client";

import { AppTopBar } from "@/components/layout/AppTopBar";
import { Greeting } from "@/components/layout/Greeting";
import { NewSurveyButton } from "@/components/layout/NewSurveyButton";

// The dashboard's bar: date + greeting and "New survey". Form pages use it too until their own
// headings move into the bar.
export function GreetingTopBar() {
  return <AppTopBar heading={<Greeting />} actions={<NewSurveyButton />} />;
}
