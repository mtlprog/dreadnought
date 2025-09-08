import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LocaleProvider } from "@/components/locale-provider";
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

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale");

  if (localeCookie !== undefined && (localeCookie.value === "en" || localeCookie.value === "ru")) {
    return localeCookie.value as Locale;
  }

  return "en"; // Default locale
}

export default async function RootLayout({
  children,
}: Readonly<{
  readonly children: Readonly<ReactNode>;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider
            delayDuration={300}
            skipDelayDuration={100}
          >
            <Header />
            <main>{children}</main>
            <Footer />
          </TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
