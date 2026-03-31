"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Store, CreditCard, Activity, ArrowRight, TrendingUp, DollarSign, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RestaurantDashboard() {
  const { userData, restaurant } = useAuth();
  const hasRestaurant = !!restaurant;

  const [orders, setOrders] = useState<any[]>([]);
  const [menuCount, setMenuCount] = useState(0);
  const [timeRange, setTimeRange] = useState("7d");
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    const fetchData = async () => {
      setLoadingStats(true);
      try {
        const menusQ = query(collection(db, "menus"), where("restaurantId", "==", restaurant.id));
        const menusSnapshot = await getDocs(menusQ);
        setMenuCount(menusSnapshot.docs.length);

        const ordersQ = query(collection(db, "orders"), where("restaurantId", "==", restaurant.id));
        const ordersSnapshot = await getDocs(ordersQ);
        
        const fetchedOrders = ordersSnapshot.docs.map(doc => doc.data());
        setOrders(fetchedOrders);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchData();
  }, [restaurant]);

  const { chartData, totalRevenue, totalOrders, averageOrderValue } = useMemo(() => {
    if (!orders.length) return { chartData: [], totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
    
    const now = Date.now();
    let timeFilter = 0;
    
    if (timeRange === "7d") {
      timeFilter = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "30d") {
      timeFilter = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "6m") {
      timeFilter = now - 180 * 24 * 60 * 60 * 1000;
    }

    const filteredOrders = orders.filter(o => o.createdAt >= timeFilter);
    
    const totalRev = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrd = filteredOrders.length;
    const avgVal = totalOrd > 0 ? totalRev / totalOrd : 0;
    
    const grouped: Record<string, number> = {};
    
    filteredOrders.forEach(o => {
      const date = new Date(o.createdAt);
      let key = "";
      if (timeRange === "6m") {
        key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      } else {
        key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += (o.totalAmount || 0);
    });
    
    const generatedData = [];
    
    if (timeRange === "6m") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        generatedData.push({ date: key, total: grouped[key] || 0 });
      }
    } else {
      const days = timeRange === "7d" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        generatedData.push({ date: key, total: grouped[key] || 0 });
      }
    }

    return {
      chartData: generatedData,
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      averageOrderValue: avgVal
    };
  }, [orders, timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3">
          <p className="text-gray-500 font-medium text-xs mb-1">{label}</p>
          <p className="text-[#0f9d6a] font-extrabold text-base">
            ₹{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Welcome, {userData?.name}</h1>
          <p className="text-gray-500 mt-1">Manage your digital presence and daily operations.</p>
        </div>
        {!hasRestaurant && (
          <Link href="/restaurant/settings">
            <Button className="rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 transition duration-200">
              Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {!hasRestaurant ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="text-emerald-900">Finish setting up your restaurant</CardTitle>
              <CardDescription className="text-emerald-700/80">
                You need to create your restaurant profile before you can manage menus and accept payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/restaurant/settings">
                <Button className="rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 transition duration-200">Create Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Top Dashboard Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Restaurant Status
                </CardTitle>
                <Store className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 truncate" title={restaurant.name}>{restaurant.name}</div>
                <div className="mt-2">
                  <Badge className={`${restaurant.subscriptionStatus === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"} border-none font-semibold px-2.5 py-0.5`}>
                    {restaurant.subscriptionStatus === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Current Plan
                </CardTitle>
                <CreditCard className="h-5 w-5 text-teal-500" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                   <Loader2 className="h-5 w-5 animate-spin text-gray-300 mt-2" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-900 capitalize">{restaurant.plan} Plan</div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      {restaurant.plan === "none" ? "Upgrade required" : "Billed monthly"}
                    </p>
                  </>
                )}
              </CardContent>
              {restaurant.plan === "none" && (
                <CardFooter className="pb-4 pt-0 mt-2 text-xs">
                  <Link href="/restaurant/subscription" className="w-full">
                     <Button variant="outline" className="w-full bg-white border-[#e5e7eb] text-[#0f172a] hover:bg-[#f1f5f9] rounded-xl font-semibold">View Plans</Button>
                  </Link>
                </CardFooter>
              )}
            </Card>

            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Menu Items
                </CardTitle>
                <Activity className="h-5 w-5 text-cyan-500" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300 mt-2" />
                ) : (
                  <>
                    <div className="text-2xl font-extrabold text-gray-900">{menuCount}</div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Total active items</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sales Analytics Graph Section */}
          <div className="pt-6">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold tracking-tight text-gray-900">Sales Overview</h2>
               <Select value={timeRange} onValueChange={(val) => setTimeRange(val || "7d")}>
                 <SelectTrigger className="w-[140px] h-9 rounded-xl border-gray-200 text-sm font-semibold text-gray-700 bg-white">
                   <SelectValue placeholder="Select range" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                   <SelectItem value="7d" className="font-medium cursor-pointer">Last 7 days</SelectItem>
                   <SelectItem value="30d" className="font-medium cursor-pointer">Last 30 days</SelectItem>
                   <SelectItem value="6m" className="font-medium cursor-pointer">Last 6 months</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden rounded-2xl">
                <div className="p-6">
                  {/* Top Stats of Graph */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div>
                      <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Total Revenue
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                        {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : `₹${totalRevenue.toLocaleString()}`}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Total Orders
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                        {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : totalOrders}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                         <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Avg Order Value
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                        {loadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : `₹${Math.round(averageOrderValue).toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  {/* Graph */}
                  <div className="h-[300px] w-full">
                    {loadingStats ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                        <span className="text-sm font-medium">Loading sales data...</span>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-gray-300" />
                        </div>
                        <span className="text-sm font-semibold text-gray-500">No sales data yet</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickFormatter={(value: number) => `₹${value}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorTotal)" 
                            activeDot={{ r: 6, fill: "#059669", strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
             </Card>
          </div>
        </>
      )}
    </div>
  );
}
