"use client";

import { AppTopBar } from "@/components/layout/AppTopBar";
import { Greeting } from "@/components/layout/Greeting";
import { NewSurveyButton } from "@/components/layout/NewSurveyButton";

// The dashboard's bar: date + greeting and "New survey". Every other view shows its own h1
// (PageHeading) instead of the greeting.
export function GreetingTopBar() {
  return <AppTopBar heading={<Greeting />} actions={<NewSurveyButton />} />;
}
