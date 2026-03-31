"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Menu as MenuIcon, Settings, CreditCard,
  LogOut, Loader2, Utensils, QrCode, ClipboardList, ChefHat, X
} from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/restaurant/menu", label: "Menu Items", icon: Utensils },
  { href: "/restaurant/tables", label: "QR Tables", icon: QrCode },
  { href: "/restaurant/orders", label: "Live Orders", icon: ClipboardList },
  { href: "/restaurant/subscription", label: "Subscription", icon: CreditCard },
  { href: "/restaurant/settings", label: "Settings", icon: Settings },
];

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, restaurant, subscription, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/login");
      else if (userData?.role !== "restaurant_owner") router.push("/admin/dashboard");
    }
  }, [user, userData, loading, router]);

  if (loading || !userData || userData.role !== "restaurant_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Dineflow Logo" width={100} height={100} className="w-auto object-contain" priority />
          <Loader2 className="h-6 w-6 animate-spin text-[#0f9d6a]" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const pageLabel = pathname.split("/").filter(Boolean).pop() || "Dashboard";
  const isSubscriptionPage = pathname === "/restaurant/subscription";

  const showBlockingModal = !loading && restaurant && !isSubscriptionPage && (
    !restaurant.plan ||
    restaurant.plan === "none" ||
    restaurant.subscriptionStatus === "inactive" ||
    restaurant.subscriptionStatus === "expired" ||
    subscription?.status === "expired" ||
    (subscription?.expiryDate && subscription.expiryDate < Date.now())
  );

  return (
    <div className="h-screen overflow-hidden flex bg-[#f8fafc] relative">
      {/* Subscription Blocking Overlay */}
      {showBlockingModal && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <CreditCard className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Subscription Expired</h2>
            <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
              Your subscription is inactive or has ended. Please choose a plan or renew to continue using Dineflow.pro features.
            </p>
            <Link href="/restaurant/subscription" className="w-full">
              <button className="w-full bg-[#0f9d6a] hover:bg-[#0c7f56] active:scale-[0.98] text-white font-bold h-14 rounded-xl transition-all shadow-md hover:shadow-lg">
                Renew Now
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-[#f8fafc] border-r border-slate-200
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="flex items-center md:justify-center justify-between p-1 border-b border-slate-200 shrink-0">
          <Image src="/logo.png" alt="Dineflow Logo" width={140} height={36} className="h-10 md:h-15 w-auto object-contain mb-1 brightness-0 opacity-80" priority />
          <button className="md:hidden text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide px-2 mb-3">Restaurant</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group ${isActive
                  ? "bg-[#e2e8f0] text-[#0f172a]"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[#0f172a]" : "text-[#64748b] group-hover:text-[#0f172a]"}`} />
                {item.label}
                {item.label === "Live Orders" && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-200 shrink-0 bg-[#f8fafc]">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-9 w-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-700 truncate">{userData.name}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">{userData.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#64748b] hover:bg-red-100 hover:text-red-600 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center px-4 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <button
            className="mr-3 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="font-bold text-slate-900 capitalize text-lg">{pageLabel}</div>
        </header>

        {/* Centered Desktop Layout + Inner White Box */}
        <main className="flex-1 overflow-y-auto w-full md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full flex flex-col">
            <div className="bg-white md:rounded-[20px] md:border border-slate-200 flex-1 flex flex-col overflow-hidden md:shadow-sm min-h-screen md:min-h-0">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
