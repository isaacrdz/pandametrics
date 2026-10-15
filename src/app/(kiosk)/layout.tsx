import type { Metadata } from "next";

// Public, but not for search engines: survey links are shared on purpose, not discovered
export const metadata: Metadata = {
  title: "Answer a survey · Panda Metrics",
  robots: { index: false, follow: false },
};

export default function KioskLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-full flex-1 flex-col bg-background">{children}</div>;
}
