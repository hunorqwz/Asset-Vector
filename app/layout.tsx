import type { Metadata } from "next";
import { Inter, Geist_Mono, VT323 } from "next/font/google";
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

const pixelFont = VT323({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Asset Vector | Surgical Market Intelligence",
    template: "%s | Asset Vector"
  },
  description: "Professional-grade market telemetry and AI-driven asset intelligence for the surgical investor.",
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
    title: "Asset Vector | Surgical Market Intelligence",
    description: "High-precision market telemetry and AI-driven forecasting.",
    url: "https://vector.surgical",
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
    title: "Asset Vector | Surgical Market Intelligence",
    description: "High-precision market telemetry and AI-driven forecasting.",
    creator: "@vectorsystems",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { AuthProvider } from "@/components/providers/SessionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${pixelFont.variable} antialiased select-none`}
      >
        <AuthProvider>
          <div className="animate-scanline" />
          <div className="vignette" />
          <div className="app-grid bg-background overflow-hidden relative">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
