"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Order as OrderType } from "@/types";
import { toast } from "sonner";
import { Bell, Loader2, ClipboardList, ShoppingBag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DineInOrders } from "./DineInOrders";
import { TakeawayOrders } from "./TakeawayOrders";

export default function UnifiedOrdersPage() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [newOrderTrigger, setNewOrderTrigger] = useState(0);

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

  if (!restaurant) return <div className="p-8 text-center text-gray-500">Please complete restaurant setup first.</div>;

  const dineInOrders = orders.filter(o => o.type === "dine-in" || !o.type);
  const takeawayOrders = orders.filter(o => o.type === "takeaway");

  const activeDineIn = dineInOrders.filter(o => o.status !== "paid" && o.isActive !== false);
  const activeTakeaway = takeawayOrders.filter(o => o.status !== "completed");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Orders Dashboard</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Real-time live operations control center.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              if (!isSoundEnabled) {
                const audio = new Audio("/new-order.mp3");
                audio.volume = 0; audio.play().catch(() => { });
              }
              setIsSoundEnabled(!isSoundEnabled);
            }}
            className={`w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors ${isSoundEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
          >
            <Bell className="h-4 w-4" />
            {isSoundEnabled ? "Sound On" : "Sound Off"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <Tabs defaultValue="dine-in" className="w-full">
          <TabsList className="max-w-md mb-6">
            <TabsTrigger value="dine-in">
              <ClipboardList className="w-4 h-4 mr-2" />
              Dine-In Orders
              {activeDineIn.length > 0 && <span className="ml-2 bg-primary/10 text-primary px-1.5 rounded font-black text-xs">{activeDineIn.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="takeaway">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Takeaways
              {activeTakeaway.length > 0 && <span className="ml-2 bg-primary/10 text-primary px-1.5 rounded font-black text-xs">{activeTakeaway.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dine-in">
            <DineInOrders dineInOrders={dineInOrders} />
          </TabsContent>
          <TabsContent value="takeaway">
            <TakeawayOrders takeaways={takeawayOrders} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
