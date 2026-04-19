"use client";

import { useAuth, isTokenValid } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Menu as MenuIcon, Settings, CreditCard,
  LogOut, Loader2, Utensils, QrCode, ClipboardList, ChefHat, X, Calendar, Activity, Zap, ShoppingBag, Smartphone
} from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";
import { Button } from "@/components/ui/button";
import WaiterNotificationSystem from "@/components/restaurant/WaiterNotificationSystem";

const navItems = [
  { href: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/restaurant/orders", label: "Orders", icon: ClipboardList },
  { href: "/restaurant/reservations", label: "Bookings", icon: Calendar },
  { href: "/restaurant/menu", label: "Menu", icon: ChefHat },
  { href: "/restaurant/tables", label: "Tables", icon: QrCode },
  { href: "/restaurant/landing-page", label: "Branding", icon: Smartphone },
  { href: "/restaurant/settings", label: "Settings", icon: Settings },
];

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, restaurant, subscription, loading, checkToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Add an effect to redirect to login if not authenticated after loading finishes
  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (pathname !== "/login") router.replace("/login");
      }
      else if (userData?.role !== "restaurant_owner") {
        if (pathname !== "/admin/dashboard") router.replace("/admin/dashboard");
      }
    }
  }, [loading, user, userData, pathname, router]);

  if (loading || !userData || userData.role !== "restaurant_owner") {
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
  const isSubscriptionPage = pathname === "/restaurant/subscription";

  const showBlockingModal = !loading && restaurant && !isSubscriptionPage && (
    !restaurant.plan ||
    restaurant.plan === "none" ||
    restaurant.subscriptionStatus === "inactive" ||
    restaurant.subscriptionStatus === "expired" ||
    subscription?.status === "expired" ||
    (subscription?.expiryDate && subscription.expiryDate < Date.now())
  );

  const planSlug = (subscription?.plan || restaurant?.plan || "none").toLowerCase();

  const getPlanBadge = () => {
    if (planSlug.includes("premium")) return { text: "PREMIUM PLAN", colorClass: "text-purple-600 bg-purple-100" };
    if (planSlug.includes("pro")) return { text: "PRO PLAN", colorClass: "text-emerald-600 bg-emerald-100" };
    if (planSlug.includes("basic")) return { text: "BASIC PLAN", colorClass: "text-blue-600 bg-blue-100" };
    return { text: "FREE / TRIAL PLAN", colorClass: "text-slate-500 bg-slate-100" };
  };
  const planBadge = getPlanBadge();

  const getUpgradeCardDetails = () => {
    if (planSlug.includes("pro")) return { title: "Upgrade to Premium", desc: "Get multi-outlet and full control", btn: "Upgrade to Premium", action: () => router.push("/restaurant/subscription") };
    if (planSlug.includes("basic")) return { title: "Upgrade to Pro", desc: "Unlock analytics and advanced features", btn: "Upgrade to Pro", action: () => router.push("/restaurant/subscription") };
    if (planSlug.includes("premium")) return { title: "Latest Updates", desc: "See what's new in Dineflow", btn: "View Updates", action: () => router.push("/restaurant/updates") };
    return { title: "Upgrade to Basic", desc: "Start using core features for your restaurant", btn: "Upgrade to Basic", action: () => router.push("/restaurant/subscription") };
  };
  const upgradeCard = getUpgradeCardDetails();

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
              <Button className="w-full bg-[#0f9d6a] [#0c7f56] [0.98] h-14">
                Renew Now
              </Button>
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
        fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col
        bg-white
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo & Restaurant Name */}
        <div className="flex flex-col gap-2 px-5 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Dineflow Icon" width={32} height={32} className="h-8 w-8 object-contain" priority />
              <span className="text-[17px] font-extrabold tracking-tight text-slate-900">DineFlow</span>
            </div>
            <Button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {restaurant && (
            <div className="mt-3 flex items-center gap-2.5 py-1 px-2  rounded-full border border-slate-100 bg-slate-50/50">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Utensils className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {restaurant.name}
                </p>
                <div className="mt-1 flex items-center">
                  <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md ${planBadge.colorClass}`}>
                    {planBadge.text}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3 mt-1">Menu</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${isActive
                  ? "bg-[#0f9d6a] text-white shadow-md shadow-emerald-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-[#0f9d6a] to-[#12b97c] opacity-100 -z-10"
                  />
                )}
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  }`} size={18} />
                {item.label}
                {item.label === "Orders" && (
                  <span className={`ml-auto flex h-2 w-2 rounded-full ${isActive ? "bg-white" : "bg-emerald-500 animate-pulse"}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Area (Upgrade Card + User Profile) */}
        <div className="p-4 border-t border-slate-100 shrink-0 bg-white space-y-4">

          {/* Upgrade Plan Card / Updates Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl p-4 border border-emerald-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 scale-150 -translate-y-4 translate-x-4">
              <Zap className="h-16 w-16 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">{upgradeCard.title}</p>
            <p className="text-xs text-slate-500 mb-3 relative z-10">{upgradeCard.desc}</p>
            <Button onClick={() => { setSidebarOpen(false); upgradeCard.action(); }} className="w-full h-8 text-[12px] text-emerald-700 hover: bg-white border border-emerald-200">
              {upgradeCard.btn}
            </Button>
          </div>

          {/* User Footer */}
          <div className="flex items-center gap-3 px-1">
            {(userData.photoUrl || user?.photoURL) ? (
              <img
                src={(userData.photoUrl || user?.photoURL) as string}
                alt={userData.name}
                className="h-9 w-9 rounded-full border border-slate-200 object-cover shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {userData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{userData.name}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">{userData.email}</p>
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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center px-4 bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <Button className="mr-3 text-slate-500 hover:" onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="font-bold text-slate-900 capitalize text-lg">{pageLabel}</div>
        </header>

        {/* Single-scroll main */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-5 md:p-6 lg:p-8 bg-neutral-50/50 m-1 rounded-2xl border">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      {restaurant?.id && <WaiterNotificationSystem restaurantId={restaurant.id} />}
    </div>
  );
}
