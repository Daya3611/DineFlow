"use client";

import { useAuth, isTokenValid } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Users, Store, CreditCard, LogOut,
  Loader2, Menu, Activity, ChefHat, X
} from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Activity },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading, checkToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Validate token initially
  useEffect(() => {
    if (!isTokenValid()) {
      localStorage.removeItem("token");
      if (pathname !== "/login") router.replace("/login");
    } else {
      setIsChecking(false);
    }
  }, [pathname, router]);

  // Periodic token validation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        localStorage.removeItem("token");
        if (pathname !== "/login") router.replace("/login");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  // Role protection once user data loads
  useEffect(() => {
    if (!isChecking && !loading) {
      if (!user) {
        if (pathname !== "/login") router.replace("/login");
      }
      else if (userData?.role !== "super_admin") {
        if (pathname !== "/restaurant/dashboard") router.replace("/restaurant/dashboard");
      }
    }
  }, [isChecking, loading, user, userData, pathname, router]);

  if (isChecking || loading || !userData || userData.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Dineflow Icon" width={48} height={48} className="h-12 w-12 object-contain" priority />
          <Loader2 className="h-6 w-6 animate-spin text-[#0f9d6a]" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  const pageLabel = pathname.split("/").filter(Boolean).pop() || "Dashboard";

  return (
    <div className="h-screen overflow-hidden flex bg-[#f8fafc]">
      {/* Mobile Overlay */}
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Dineflow Icon" width={32} height={32} className="h-8 w-8 object-contain" priority />
            <span className="text-[15px] font-extrabold tracking-tight text-slate-800">Dineflow</span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide px-2 mb-3">Management</div>
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
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? "text-[#0f172a]" : "text-[#64748b] group-hover:text-[#0f172a]"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-200 shrink-0 bg-[#f8fafc]">
          <div className="flex items-center gap-3 px-1">
            <div className="h-9 w-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{userData.name}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">{userData.email}</p>
            </div>
            <AppDropdown
              items={[
                {
                  label: "Sign out",
                  icon: LogOut,
                  danger: true,
                  onClick: handleLogout,
                },
              ]}
            />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center px-4 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <button
            className="mr-3 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-bold text-slate-900 capitalize text-lg">{pageLabel}</div>
          <div className="ml-auto">
            <div className="flex items-center gap-2 bg-[#0f9d6a]/10 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200">
              <div className="h-1.5 w-1.5 rounded-full bg-[#0f9d6a] animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Single-scroll main */}
        <main className="flex-1 overflow-y-auto w-full md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white md:rounded-[20px] md:border border-slate-200 md:shadow-sm p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
