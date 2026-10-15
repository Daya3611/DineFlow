"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  ChefHat,
  QrCode,
  Smartphone,
  Settings,
  X,
  Zap,
  LogOut,
  MoreVertical,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDropdown } from "@/components/common/AppDropdown";
import { RestaurantSelector } from "./RestaurantSelector";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/restaurant/orders", label: "Orders", icon: ClipboardList, badge: true },
  { href: "/restaurant/reservations", label: "Bookings", icon: Calendar },
  { href: "/restaurant/menu", label: "Menu", icon: ChefHat },
  { href: "/restaurant/tables", label: "Tables", icon: QrCode },
  { href: "/restaurant/landing-page", label: "Branding", icon: Smartphone },
  { href: "/restaurant/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, user, restaurant, subscription, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col
        bg-white border-r border-slate-200/80
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static shrink-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}
    >
      {/* Top Header & Logo */}
      <div className="p-5 pb-3 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/restaurant/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="DineFlow Logo"
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
                priority
              />
            </div>
            <span className="text-[19px] font-extrabold tracking-tight text-slate-900">
              DineFlow
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Restaurant Selector Card */}
        <RestaurantSelector restaurant={restaurant} subscription={subscription} />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2.5 mt-2">
          MAIN
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/restaurant/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? "bg-[#16A34A] text-white shadow-[0_4px_14px_rgba(22,163,74,0.28)]"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                }`}
                size={18}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && !isActive && (
                <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer Cards */}
      <div className="p-4 border-t border-slate-100 shrink-0 space-y-3 bg-white">
        {/* Latest Updates Card */}
        <div className="bg-[#EEF2FF]/70 rounded-2xl p-3.5 border border-indigo-100/70 relative overflow-hidden">
          <p className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
            Latest Updates
          </p>
          <p className="text-[11px] text-slate-500 leading-snug mb-2.5">
            New inventory tracking tools are now live for premium users.
          </p>
          <Link
            href="/restaurant/updates"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] hover:underline"
          >
            View Release Notes <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* User Profile Footer */}
        <div className="flex items-center gap-3 pt-1 px-1">
          {userData?.photoUrl || user?.photoURL ? (
            <img
              src={(userData?.photoUrl || user?.photoURL) as string}
              alt={userData?.name || "User"}
              className="h-9 w-9 rounded-full border border-slate-200 object-cover shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : "N"}
            </div>
          )}

          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {userData?.name || "Nitesh Kumar"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {userData?.email || "nitesh@gmail.com"}
            </p>
          </div>

          <AppDropdown
            items={[
              {
                label: "Subscription",
                icon: Zap,
                onClick: () => router.push("/restaurant/subscription"),
              },
              {
                label: "Sign out",
                icon: LogOut,
                danger: true,
                separator: true,
                onClick: handleLogout,
              },
            ]}
          />
        </div>
      </div>
    </aside>
  );
}
