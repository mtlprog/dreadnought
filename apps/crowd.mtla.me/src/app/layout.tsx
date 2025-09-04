import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

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

export default function RootLayout({
  children,
}: Readonly<{
  readonly children: Readonly<ReactNode>;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
