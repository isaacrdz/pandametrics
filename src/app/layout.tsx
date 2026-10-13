import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALE_SCRIPT } from "@/i18n/locale-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Always the default locale: the server cannot read the language stored in the browser
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* ThemeProvider renders an inline script, so it stays outside LocaleProvider,
            which may mount its children again on the client */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LocaleProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </LocaleProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
