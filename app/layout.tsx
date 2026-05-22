import type { Metadata } from "next";
import { Inter, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://assetvector.app'),
  title: {
    default: "Asset Vector | Premium Market Intelligence",
    template: "%s | Asset Vector"
  },
  description: "Professional-grade market telemetry and AI-driven asset intelligence.",
  keywords: ["market intelligence", "AI trading", "financial dashboard", "asset tracking", "telemetry"],
  authors: [{ name: "Vector Systems" }],
  creator: "Vector Systems",
  publisher: "Vector Systems",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Asset Vector | Premium Market Intelligence",
    description: "High-precision market analysis and AI-driven forecasting.",
    url: "https://assetvector.app",
    siteName: "Asset Vector",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Asset Vector Interface",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset Vector | Premium Market Intelligence",
    description: "High-precision market analysis and AI-driven forecasting.",
    creator: "@vectorsystems",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { AuthProvider } from "@/components/providers/SessionProvider";
import { AlpacaProvider } from "@/components/providers/AlpacaProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${displayFont.variable} antialiased select-none`}
      >
        <AuthProvider>
          <AlpacaProvider>
            <div className="app-grid bg-background overflow-hidden relative">
              {children}
            </div>
          </AlpacaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
