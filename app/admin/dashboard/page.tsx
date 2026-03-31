"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, CreditCard, Activity, Loader2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    restaurants: 0,
    activeSubs: 0,
    monthlyRevenue: 0,
  });
  
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentRestaurants, setRecentRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        const usersCount = usersSnap.size;
        
        // Fetch Recent Users (Without index, we'll manually sort for now since data is small, 
        // to avoid unindexed query crashes on new Firebase setups)
        const allUsers: any[] = [];
        usersSnap.forEach((d) => allUsers.push(d.data()));
        allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRecentUsers(allUsers.slice(0, 5));

        // Fetch Restaurants & Revenue
        const restSnap = await getDocs(collection(db, "restaurants"));
        let subCount = 0;
        let revenue = 0;
        const allRests: any[] = [];

        restSnap.forEach((doc) => {
          const rest = doc.data();
          allRests.push(rest);
          if (rest.subscriptionStatus === "active") {
            subCount++;
            revenue += rest.plan === "pro" ? 499 : rest.plan === "premium" ? 999 : 299;
          }
        });

        allRests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRecentRestaurants(allRests.slice(0, 5));

        setStats({
          users: usersCount,
          restaurants: restSnap.size,
          activeSubs: subCount,
          monthlyRevenue: revenue,
        });

      } catch (error) {
        console.error("Failed to load admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#0f9d6a]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="font-semibold text-sm tracking-widest uppercase">Fetching Live Data ...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Restaurants", value: stats.restaurants, icon: <Store className="h-5 w-5" />, color: "bg-emerald-50 text-[#0f9d6a] border-emerald-100" },
    { title: "Active Users", value: stats.users, icon: <Users className="h-5 w-5" />, color: "bg-teal-50 text-teal-600 border-teal-100" },
    { title: "Active Subscriptions", value: stats.activeSubs, icon: <Activity className="h-5 w-5" />, color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
    { title: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toLocaleString()}`, icon: <CreditCard className="h-5 w-5" />, color: "bg-green-50 text-green-600 border-green-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence>
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-gray-100 shadow-sm shadow-gray-100">
                <CardHeader className="flex flex-row items-center justify-between pb-2 px-5 pt-5 space-y-0">
                  <CardTitle className="text-sm font-semibold text-gray-500">
                    {stat.title}
                  </CardTitle>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${stat.color}`}>
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Registrations */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-gray-100 shadow-sm shadow-gray-100 col-span-1 min-h-[350px]">
            <CardHeader className="border-b border-gray-50 px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Recent User Registrations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No users found</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentUsers.map((user, idx) => (
                    <li key={idx} className="flex justify-between items-center p-5 hover:bg-gray-50 transition-colors">
                      <div className="overflow-hidden pr-4">
                        <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${user.role === "super_admin" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {user.role}
                        </span>
                        {user.createdAt && (
                           <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                             <Calendar className="h-3 w-3" />
                             {new Date(user.createdAt).toLocaleDateString()}
                           </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Recent Restaurants */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-gray-100 shadow-sm shadow-gray-100 col-span-1 min-h-[350px]">
            <CardHeader className="border-b border-gray-50 px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-teal-500" />
                Recently Created Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentRestaurants.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No restaurants onboarded yet</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {recentRestaurants.map((rest, idx) => (
                    <li key={idx} className="flex justify-between items-center p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden pr-4">
                        {rest.logo ? (
                           <img src={rest.logo} alt="logo" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                        ) : (
                           <div className="w-10 h-10 rounded-lg shrink-0 bg-emerald-100 text-[#0f9d6a] flex items-center justify-center font-bold">
                             {rest.name?.charAt(0)}
                           </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{rest.name}</div>
                          <div className="text-sm text-gray-500 truncate capitalize">{rest.plan} Plan</div>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${rest.subscriptionStatus === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {rest.subscriptionStatus}
                        </span>
                        {rest.createdAt && (
                           <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                             <Calendar className="h-3 w-3" />
                             {new Date(rest.createdAt).toLocaleDateString()}
                           </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
