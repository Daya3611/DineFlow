"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Store,
  CreditCard,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Loader2,
  ShoppingBag,
  UtensilsCrossed,
  ArrowRight,
  LayoutGrid,
  Sparkles,
  CalendarDays,
  Download,
  ChefHat,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ─── animation helpers ─────────────────────────────────────────── */
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/* ─── tiny helper: format currency ──────────────────────────────── */
const fmt = (n: number) =>
  n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { pct: number; label: string };
  loading?: boolean;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div
              className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className={`h-4.5 w-4.5 ${iconColor}`} size={18} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-28 mb-2" />
          ) : (
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {value}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            {trend && !loading && (
              <span
                className={`flex items-center gap-0.5 text-xs font-bold ${trend.pct >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
              >
                {trend.pct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.pct >= 0 ? "+" : ""}
                {trend.pct}%
              </span>
            )}
            {sub && (
              <span className="text-xs text-gray-400 font-medium">{sub}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Skeleton for stat cards ────────────────────────────────────── */
function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3">
        <p className="text-gray-400 font-medium text-xs mb-1">{label}</p>
        <p className="text-[#0f9d6a] font-extrabold text-base">
          ₹{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function RestaurantDashboard() {
  const { userData, restaurant, subscription } = useAuth();
  const hasRestaurant = !!restaurant;

  const remainingDays = useMemo(() => {
    if (!subscription?.expiryDate) return null;
    return Math.ceil((subscription.expiryDate - Date.now()) / 86400000);
  }, [subscription]);

  const [orders, setOrders] = useState<any[]>([]);
  const [menuCount, setMenuCount] = useState(0);
  const [tables, setTables] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [loadingStats, setLoadingStats] = useState(true);
  const [chartTab, setChartTab] = useState("revenue");

  useEffect(() => {
    if (!restaurant) return;
    const fetchData = async () => {
      setLoadingStats(true);
      try {
        const [menusSnap, ordersSnap, tablesSnap] = await Promise.all([
          getDocs(
            query(collection(db, "menus"), where("restaurantId", "==", restaurant.id))
          ),
          getDocs(
            query(collection(db, "orders"), where("restaurantId", "==", restaurant.id))
          ),
          getDocs(
            query(collection(db, "tables"), where("restaurantId", "==", restaurant.id))
          ),
        ]);
        setMenuCount(menusSnap.docs.length);
        setOrders(ordersSnap.docs.map((d) => d.data()));
        setTables(tablesSnap.docs.map((d) => d.data()));
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchData();
  }, [restaurant]);

  /* ── derived stats ─────────────────────────────────────────── */
  const {
    chartData,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    popularItems,
    prevRevenue,
    prevOrders,
  } = useMemo(() => {
    if (!orders.length)
      return {
        chartData: [],
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        popularItems: [],
        prevRevenue: 0,
        prevOrders: 0,
      };

    const now = Date.now();
    const days = timeRange === "6m" ? 180 : timeRange === "30d" ? 30 : 7;
    const cutoff = now - days * 86400000;
    const prevCutoff = cutoff - days * 86400000;

    const current = orders.filter((o) => o.createdAt >= cutoff);
    const previous = orders.filter(
      (o) => o.createdAt >= prevCutoff && o.createdAt < cutoff
    );

    const totalRev = current.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalOrd = current.length;
    const prevRev = previous.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevOrd = previous.length;

    const grouped: Record<string, { rev: number; cnt: number }> = {};
    const itemCounts: Record<
      string,
      { name: string; count: number; rev: number }
    > = {};

    current.forEach((o) => {
      const date = new Date(o.createdAt);
      const key =
        timeRange === "6m"
          ? date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!grouped[key]) grouped[key] = { rev: 0, cnt: 0 };
      grouped[key].rev += o.totalAmount || 0;
      grouped[key].cnt += 1;
      (o.items || []).forEach((item: any) => {
        if (!itemCounts[item.id])
          itemCounts[item.id] = { name: item.name, count: 0, rev: 0 };
        itemCounts[item.id].count += item.quantity;
        itemCounts[item.id].rev += item.price * item.quantity;
      });
    });

    const generated: { date: string; revenue: number; orders: number }[] = [];
    if (timeRange === "6m") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        generated.push({ date: key, revenue: grouped[key]?.rev || 0, orders: grouped[key]?.cnt || 0 });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        generated.push({ date: key, revenue: grouped[key]?.rev || 0, orders: grouped[key]?.cnt || 0 });
      }
    }

    return {
      chartData: generated,
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      averageOrderValue: totalOrd > 0 ? totalRev / totalOrd : 0,
      popularItems: Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      prevRevenue: prevRev,
      prevOrders: prevOrd,
    };
  }, [orders, timeRange]);

  const revTrend =
    prevRevenue === 0
      ? null
      : Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
  const ordTrend =
    prevOrders === 0
      ? null
      : Math.round(((totalOrders - prevOrders) / prevOrders) * 100);

  const freeTables = tables.filter((t) => !t.status || t.status === "free").length;
  const occTables = tables.filter((t) => t.status === "occupied").length;
  const resTables = tables.filter((t) => t.status === "reserved").length;

  /* ── plan expiry colours ───────────────────────────────────── */
  const expiryColor =
    remainingDays === null
      ? "text-gray-400"
      : remainingDays <= 0
        ? "text-red-500"
        : remainingDays <= 3
          ? "text-red-500"
          : remainingDays <= 10
            ? "text-amber-500"
            : "text-emerald-600";

  /* ── chart data key ────────────────────────────────────────── */
  const chartKey = chartTab === "revenue" ? "revenue" : "orders";
  const chartColor = chartTab === "revenue" ? "#10b981" : "#6366f1";
  const gradientId = chartTab === "revenue" ? "gradRev" : "gradOrd";

  /* ── tick formatter ────────────────────────────────────────── */
  const tickFmt =
    chartTab === "revenue"
      ? (v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)
      : (v: number) => `${v}`;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-7 pb-6">
      {/* ══ HEADER ════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Here's what's happening today,&nbsp;
            <span className="font-semibold text-gray-700">{userData?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v || "7d")}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl border-gray-200 text-sm font-semibold text-gray-700 bg-white">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-lg">
              <SelectItem value="7d" className="font-medium cursor-pointer">Last 7 days</SelectItem>
              <SelectItem value="30d" className="font-medium cursor-pointer">Last 30 days</SelectItem>
              <SelectItem value="6m" className="font-medium cursor-pointer">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ══ SETUP PROMPT (no restaurant) ══════════════════════ */}
      {!hasRestaurant && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-emerald-900 text-lg">Finish setting up your restaurant</p>
                <p className="text-emerald-700/80 text-sm mt-1">
                  Create your restaurant profile to start managing menus and accepting payments.
                </p>
              </div>
              <Link href="/restaurant/settings">
                <Button className="rounded-xl bg-[#0f9d6a] text-white hover:bg-[#0c7f56] gap-2 shrink-0">
                  Complete Setup <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasRestaurant && (
        <>
          {/* ══ STAT CARDS ════════════════════════════════════ */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {loadingStats ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title="Total Revenue"
                  value={`₹${totalRevenue.toLocaleString()}`}
                  sub={`vs prev period`}
                  icon={IndianRupee}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={revTrend !== null ? { pct: revTrend, label: "vs prev" } : undefined}
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  sub="completed orders"
                  icon={ShoppingBag}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-500"
                  trend={ordTrend !== null ? { pct: ordTrend, label: "vs prev" } : undefined}
                />
                <StatCard
                  title="Avg Order Value"
                  value={`₹${Math.round(averageOrderValue).toLocaleString()}`}
                  sub="per order"
                  icon={TrendingUp}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-500"
                />
                <StatCard
                  title="Menu Items"
                  value={menuCount}
                  sub="active items"
                  icon={UtensilsCrossed}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-500"
                />
              </>
            )}
          </motion.div>

          {/* ══ RESTAURANT SUMMARY + TABLES ═══════════════════ */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-5 gap-4"
          >
            {/* Restaurant Profile Summary */}
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <Card className="rounded-2xl border-gray-100 shadow-sm h-full overflow-hidden">
                <div className="h-1.5 w-full " />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                      <Store className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                        Restaurant
                      </p>
                      <h2 className="text-xl font-extrabold text-gray-900 truncate">
                        {restaurant.name}
                      </h2>
                      <Badge
                        className={`mt-1 border-0 font-semibold text-xs px-2 py-0.5 ${restaurant.subscriptionStatus === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                          }`}
                      >
                        {restaurant.subscriptionStatus === "active" ? "● Active" : "● Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-2.5">
                    {/* Plan */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                        Current Plan
                      </div>
                      <Badge
                        className={`border-0 text-xs font-bold px-2 capitalize ${restaurant.plan === "premium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {restaurant.plan === "premium" && (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {restaurant.plan} Plan
                      </Badge>
                    </div>

                    {/* Expiry */}
                    {subscription?.expiryDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                          Expires
                        </div>
                        <span className={`text-sm font-bold ${expiryColor}`}>
                          {remainingDays !== null && remainingDays <= 0
                            ? "Expired"
                            : remainingDays !== null
                              ? `in ${remainingDays} days`
                              : "—"}
                        </span>
                      </div>
                    )}

                    {/* Lifetime badge */}
                    {restaurant.plan !== "none" && !subscription?.expiryDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Lifetime Access
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">
                          ✓ Active
                        </Badge>
                      </div>
                    )}
                  </div>

                  {restaurant.plan === "none" && (
                    <Link href="/restaurant/subscription" className="block">
                      <Button
                        size="sm"
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-md shadow-emerald-200 hover:shadow-lg transition-all gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Upgrade Plan
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tables Overview */}
            <motion.div variants={fadeUp} className="lg:col-span-3">
              <Card className="rounded-2xl border-gray-100 shadow-sm h-full overflow-hidden">
                <CardHeader className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-[#0f9d6a]" />
                      Tables Overview
                    </CardTitle>
                    <Link href="/restaurant/tables">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-400 hover:text-gray-700 gap-1 px-2"
                      >
                        Manage <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {loadingStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Total */}
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-gray-200 flex items-center justify-center mb-1">
                          <UtensilsCrossed className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="text-2xl font-extrabold text-gray-900">
                          {tables.length}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">Total</span>
                      </div>

                      {/* Free */}
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-emerald-200 flex items-center justify-center mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="text-2xl font-extrabold text-emerald-700">
                          {freeTables}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">Free</span>
                      </div>

                      {/* Occupied */}
                      <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-red-200 flex items-center justify-center mb-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="text-2xl font-extrabold text-red-600">
                          {occTables}
                        </span>
                        <span className="text-xs text-red-500 font-medium">Occupied</span>
                      </div>

                      {/* Reserved */}
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center mb-1">
                          <Clock3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="text-2xl font-extrabold text-amber-600">
                          {resTables}
                        </span>
                        <span className="text-xs text-amber-600 font-medium">Reserved</span>
                      </div>
                    </div>
                  )}

                  {/* Capacity bar */}
                  {!loadingStats && tables.length > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 font-medium mb-1.5">
                        <span>Capacity Usage</span>
                        <span>
                          {Math.round(((occTables + resTables) / tables.length) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                        {occTables > 0 && (
                          <div
                            className="h-full bg-red-400 rounded-full transition-all duration-700"
                            style={{ width: `${(occTables / tables.length) * 100}%` }}
                          />
                        )}
                        {resTables > 0 && (
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-700"
                            style={{ width: `${(resTables / tables.length) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* ══ SALES CHART ═══════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.38 }}
          >
            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="px-6 pt-6 pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Sales Analytics
                    </CardTitle>
                    <Tabs
                      value={chartTab}
                      onValueChange={setChartTab}
                      className="h-8"
                    >
                      <TabsList className="h-8 bg-gray-100 rounded-lg p-0.5">
                        <TabsTrigger
                          value="revenue"
                          className="h-7 px-3 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 font-medium"
                        >
                          Revenue
                        </TabsTrigger>
                        <TabsTrigger
                          value="orders"
                          className="h-7 px-3 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium"
                        >
                          Orders
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <IndianRupee className="h-3 w-3 text-emerald-500" /> Revenue
                    </p>
                    {loadingStats ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        ₹{totalRevenue.toLocaleString()}
                      </p>
                    )}
                    {revTrend !== null && !loadingStats && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-bold mt-1 ${revTrend >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                      >
                        {revTrend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {revTrend >= 0 ? "+" : ""}
                        {revTrend}% vs prev
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3 text-blue-500" /> Orders
                    </p>
                    {loadingStats ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {totalOrders}
                      </p>
                    )}
                    {ordTrend !== null && !loadingStats && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-bold mt-1 ${ordTrend >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                      >
                        {ordTrend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {ordTrend >= 0 ? "+" : ""}
                        {ordTrend}% vs prev
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-violet-500" /> Avg Order
                    </p>
                    {loadingStats ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        ₹{Math.round(averageOrderValue).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[280px] w-full">
                  {loadingStats ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                      <span className="text-sm font-medium">Loading chart...</span>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-gray-300" />
                      </div>
                      <span className="text-sm font-semibold text-gray-500">No sales data yet</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          dy={10}
                          interval={timeRange === "30d" ? 4 : 0}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickFormatter={tickFmt}
                          width={55}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey={chartKey}
                          stroke={chartColor}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill={`url(#${gradientId})`}
                          activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ══ POPULAR ITEMS ════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.38 }}
          >
            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ChefHat className="h-4.5 w-4.5 text-[#0f9d6a]" size={18} />
                    Popular Items
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-gray-200 text-gray-500 text-xs font-semibold"
                  >
                    Top {popularItems.length}
                  </Badge>
                </div>
              </CardHeader>

              {loadingStats ? (
                <div className="divide-y divide-gray-50">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                      <Skeleton className="h-4 flex-1 max-w-[160px]" />
                      <Skeleton className="h-4 w-12 ml-auto" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : popularItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                  <UtensilsCrossed className="h-8 w-8 text-gray-200" />
                  <p className="text-sm font-medium">No item data for this period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {popularItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.38 + idx * 0.05 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Rank badge */}
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${idx === 0
                          ? "bg-amber-100 text-amber-600"
                          : idx === 1
                            ? "bg-gray-100 text-gray-500"
                            : idx === 2
                              ? "bg-orange-100 text-orange-500"
                              : "bg-gray-50 text-gray-400"
                          }`}
                      >
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>

                      {/* Name */}
                      <p className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-[#0f9d6a] transition-colors truncate">
                        {item.name}
                      </p>

                      {/* Units */}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400 font-medium">Units</p>
                        <p className="text-sm font-bold text-gray-700">{item.count}</p>
                      </div>

                      {/* Revenue */}
                      <div className="text-right shrink-0 min-w-[72px]">
                        <p className="text-xs text-gray-400 font-medium">Revenue</p>
                        <p className="text-sm font-extrabold text-emerald-600">
                          ₹{item.rev.toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
