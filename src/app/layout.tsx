import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import CapacitorBridge from "@/components/CapacitorBridge";
import "@/styles/timebridge.css";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          <CapacitorBridge />
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
