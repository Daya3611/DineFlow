"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Order as OrderType } from "@/types";
import { toast } from "sonner";
import { Bell, Loader2, ClipboardList, ShoppingBag, Receipt, Search, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DineInOrders } from "./DineInOrders";
import { TakeawayOrders } from "./TakeawayOrders";
import { SessionsView } from "@/components/restaurant/SessionsView";
import { Switch } from "@/components/ui/switch";

export default function UnifiedOrdersPage() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [newOrderTrigger, setNewOrderTrigger] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");

  const playNewOrderSound = () => {
    const audio = new Audio("/new-order.mp3");
    audio.play().catch(() => { });
  };

  useEffect(() => {
    if (newOrderTrigger > 0 && isSoundEnabled) {
      playNewOrderSound();
      toast.success("🔔 New order received!");
    }
  }, [newOrderTrigger, isSoundEnabled]);

  useEffect(() => {
    if (!restaurant) return;

    setLoading(true);
    const q = query(
      collection(db, "orders"),
      where("restaurantId", "==", restaurant.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: OrderType[] = [];
      let newIncoming = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newOrder = change.doc.data() as OrderType;
          if (newOrder.status === "pending" && Date.now() - newOrder.createdAt < 60000) {
            newIncoming = true;
          }
        }
      });

      snapshot.forEach((d) => {
        fetchedOrders.push({ ...d.data() as OrderType, id: d.id });
      });

      fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);

      setOrders(fetchedOrders);
      setLoading(false);

      if (newIncoming) setNewOrderTrigger(prev => prev + 1);
    }, () => {
      toast.error("Error connecting to real-time orders");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  if (!restaurant) return <div className="p-8 text-center text-slate-500">Please complete restaurant setup first.</div>;

  const takeawayOrders = orders.filter(o => ["takeaway", "pickup", "delivery"].includes(o.type || (o as any).orderType));
  const dineInOrders = orders.filter(o => !["takeaway", "pickup", "delivery"].includes(o.type || (o as any).orderType));

  const activeDineIn = dineInOrders.filter(o => o.status !== "paid" && o.isActive !== false);
  const activeTakeaway = takeawayOrders.filter(o => o.status !== "completed");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="sessions" className="w-full space-y-4">
        {/* Integrated Top Bar Header matching screenshot #3 EXACTLY */}
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Title & Command Center subtitle */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                Orders
              </h1>
            </div>

            {/* Segmented Control Tabs matching screenshot */}
            <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
              <TabsList className="bg-slate-100/90 p-1 rounded-xl">
                <TabsTrigger
                  value="sessions"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#16A34A] data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                  Active Sessions
                </TabsTrigger>
                <TabsTrigger
                  value="dine-in"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#16A34A] data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                  Dine-In Orders
                </TabsTrigger>
                <TabsTrigger
                  value="takeaway"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#16A34A] data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                  Takeaways
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Sound alerts</span>
                <Switch
                  checked={isSoundEnabled}
                  onCheckedChange={setIsSoundEnabled}
                />
              </div>
            </div>
          </div>

          {/* Right Search, Today Filter & Bell */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, tables..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16A34A] focus:bg-white"
              />
            </div>

            <button className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 transition-colors shrink-0">
              <Calendar className="h-3.5 w-3.5 text-slate-500" /> Today
            </button>

            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-slate-200/80 ${isSoundEnabled ? "bg-emerald-50 text-[#16A34A] border-emerald-200" : "bg-white text-slate-400"
                }`}
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
          </div>
        ) : (
          <>
            <TabsContent value="sessions" className="mt-0">
              <SessionsView orders={orders} restaurantId={restaurant.id} />
            </TabsContent>
            <TabsContent value="dine-in" className="mt-0">
              <DineInOrders dineInOrders={dineInOrders} />
            </TabsContent>
            <TabsContent value="takeaway" className="mt-0">
              <TakeawayOrders takeaways={takeawayOrders} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
