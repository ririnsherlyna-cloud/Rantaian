import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MICAPROFITA — Arena AGI Kripto · Cyborg Pemburu Profit Harian",
  description: "Cyborg AGI kripto: koin harian, arah biner BUY/SELL, arena pertarungan melawan AI rival (GLM, momentum, mean-reversion), evolusi genome, memori terkompresi bebas kebocoran, dan guru para trader.",
  keywords: ["crypto", "AGI", "trading", "bitcoin", "altcoin", "buy sell", "arena AI", "cyborg", "profit harian"],
  authors: [{ name: "Tim MICAPROFITA" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "MICAPROFITA — Arena AGI Kripto",
    description: "Ajang pertarungan AGI kripto: koin harian, arah biner, profit terbesar menang",
    siteName: "MICAPROFITA Arena",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
