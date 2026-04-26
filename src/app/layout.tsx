import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Lato } from "next/font/google";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import CapacitorBridge from "@/components/CapacitorBridge";
import "./globals.css";
import "@/styles/timebridge.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Time Bridge — My love stays, always",
  description: "Preserve your most precious memories and deliver them to your loved ones exactly when they are needed most. A legacy message platform built for Singapore.",
  keywords: ["legacy", "memory", "Singapore", "estate planning", "letter", "message"],
  authors: [{ name: "Time Bridge" }],
  creator: "Time Bridge",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://timebridge.sg"),
  openGraph: {
    title: "Time Bridge — My love stays, always",
    description: "Store your most precious memories and deliver them to loved ones when the time comes.",
    type: "website",
    locale: "en_SG",
    siteName: "Time Bridge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Time Bridge",
    description: "Store your most precious memories and deliver them to loved ones when the time comes.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FAF7F2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${lato.variable}`}>
        <Providers>
          <CapacitorBridge />
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
