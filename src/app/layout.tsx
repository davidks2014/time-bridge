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
  title: {
    default: "Time Bridge — Your words, delivered when they need it most",
    template: "%s | Time Bridge",
  },
  description: "Time Bridge helps Singapore families preserve love letters, insurance documents, and memories — delivered to loved ones at exactly the right moment. Free to start.",
  keywords: ["legacy message Singapore", "letter to child", "estate planning Singapore", "memory delivery", "CPF nomination", "insurance document storage", "time capsule letter Singapore"],
  authors: [{ name: "Time Bridge" }],
  creator: "Time Bridge",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://timebridge.sg"),
  openGraph: {
    title: "Time Bridge — Your words, delivered when they need it most",
    description: "Preserve love letters, insurance documents, and memories for your family. Delivered at exactly the right moment. Built for Singapore.",
    type: "website",
    locale: "en_SG",
    siteName: "Time Bridge",
    url: "https://timebridge.sg",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Time Bridge — Your words, delivered when they need it most",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Time Bridge — Your words, delivered when they need it most",
    description: "Preserve love letters, insurance documents, and memories for your family. Delivered at exactly the right moment.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://timebridge.sg",
  },
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
