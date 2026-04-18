import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import BottomNav from "@/components/mobile/BottomNav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
};

export const metadata: Metadata = {
  title: "Dineflow.pro – Restaurant QR & Management Platform",
  description: "The modern SaaS platform for restaurant digital menus, QR ordering, and business management.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`open-sans-a h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F9FAFB] text-gray-900 overflow-x-hidden pb-16 md:pb-0" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <BottomNav />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
