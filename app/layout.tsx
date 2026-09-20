import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Derma Glow Precision Care",
  description: "DermaGlow's physician-led, measurable dermatology treatment journey.",
  manifest: "/manifest.webmanifest",
  applicationName: "Derma Glow Precision Care",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Derma Glow" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
  other: { "codex-preview": "development" },
};

export const viewport = { themeColor: "#30204d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar"><body className="antialiased">{children}<PwaRegister/></body></html>;
}
