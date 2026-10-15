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
import { Sidebar } from "@/components/dashboard/Sidebar";

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

      {/* Redesigned Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Mobile Header (Shown only on small screens if needed, otherwise DashboardHeader handles page header) */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 bg-white border-b border-slate-200/80 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="DineFlow" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="font-extrabold text-slate-900 capitalize text-base">DineFlow</span>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-600" onClick={() => setSidebarOpen(true)}>
            <MenuIcon className="h-5 w-5" />
          </Button>
        </header>

        {/* Single-scroll main */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-7 bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      {restaurant?.id && <WaiterNotificationSystem restaurantId={restaurant.id} />}
    </div>
  );
}
