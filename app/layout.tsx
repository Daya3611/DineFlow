import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { FramerToaster } from "@/components/ui/framer-toaster";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";

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
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F9FAFB] text-gray-900 overflow-x-hidden" suppressHydrationWarning>
        <SmoothScrollProvider>
          <AuthProvider>
            {children}
            <FramerToaster />
          </AuthProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
