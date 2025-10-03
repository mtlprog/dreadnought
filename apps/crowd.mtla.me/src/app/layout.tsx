import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LocaleClientProvider } from "@/components/locale-client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Montelibero Crowdfunding Platform",
  title: "MTL Crowd - Montelibero Funding",
  description:
    "Support freedom-focused projects with MTLCrowd tokens. Decentralized funding platform powered by Stellar blockchain.",
  icons: {
    icon: "/mtl_crowd.png",
    shortcut: "/mtl_crowd.png",
    apple: "/mtl_crowd.png",
  },
};

type Locale = "en" | "ru";
type Theme = "system" | "light" | "dark";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale");

  if (localeCookie !== undefined && (localeCookie.value === "en" || localeCookie.value === "ru")) {
    return localeCookie.value as Locale;
  }

  return "en"; // Default locale
}

async function getServerTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme");

  if (
    themeCookie !== undefined
    && (themeCookie.value === "system" || themeCookie.value === "light" || themeCookie.value === "dark")
  ) {
    return themeCookie.value as Theme;
  }

  return "dark"; // Default theme
}

export default async function RootLayout({
  children,
}: Readonly<{
  readonly children: Readonly<ReactNode>;
}>) {
  const locale = await getServerLocale();
  const theme = await getServerTheme();

  // Resolve system theme to actual theme for SSR
  // In production, default to dark for system theme
  const resolvedTheme = theme === "system" ? "dark" : theme;

  return (
    <html lang={locale} className={resolvedTheme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleClientProvider initialLocale={locale}>
          <TooltipProvider
            delayDuration={300}
            skipDelayDuration={100}
          >
            <Header />
            <main>{children}</main>
            <Footer />
          </TooltipProvider>
        </LocaleClientProvider>
      </body>
    </html>
  );
}
