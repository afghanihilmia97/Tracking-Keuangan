import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "FinanceTrack — Keuangan Harian",
  description: "Catat pemasukan, pengeluaran, anggaran, dan tujuan keuangan pribadi dalam satu aplikasi.",
  applicationName: "FinanceTrack",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FinanceTrack" },
  other: {
    "theme-color": "#6758ef",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  );
}
