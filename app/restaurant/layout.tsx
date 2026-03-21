"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  const { user, userData, loading } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-[#ECFDF5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const pageLabel = pathname.split("/").filter(Boolean).pop() || "Dashboard";

  return (
    <div className="h-screen overflow-hidden flex bg-[#F0FDF4]">
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
        bg-[#052e16] border-r border-emerald-900/60
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-emerald-900/60 gap-3 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">DineFlow</span>
          <button className="md:hidden text-emerald-400 ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest px-3 mb-3">Restaurant</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${isActive
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-900/50"
                  : "text-emerald-300 hover:bg-emerald-900/60 hover:text-white"
                  }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-emerald-500 group-hover:text-white"}`} />
                {item.label}
                {item.label === "Live Orders" && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-white truncate">{userData.name}</p>
              <p className="text-xs text-emerald-500 truncate">{userData.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-900/60 hover:text-white transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-4 md:px-6 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <button
            className="md:hidden mr-3 p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="font-bold text-gray-900 capitalize text-lg">{pageLabel}</div>
            <div className="text-xs text-gray-400 hidden sm:block">{userData.name}</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
