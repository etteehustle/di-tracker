import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "react-day-picker/style.css";
import "./globals.css";
import "./styles.scss";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerRegistration } from "./components/pwa/ServiceWorkerRegistration";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  applicationName: "DI Tracker",
  title: "DI Tracker",
  description: "Dual Investment operating system and performance ledger",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DI Tracker"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body>
        <TooltipProvider>
          {children}
          <ServiceWorkerRegistration />
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
