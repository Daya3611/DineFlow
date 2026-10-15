"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Restaurant, Order as OrderType } from "@/types";
import { CustomerHeaderNav } from "@/components/customer/CustomerHeaderNav";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Clock, CheckCircle, Truck, ChevronRight } from "lucide-react";

interface MyOrdersClientProps {
  restaurant: Restaurant;
  slug: string;
}

export function MyOrdersClient({ restaurant, slug }: MyOrdersClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "past" | "cancelled">("active");
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const q = query(
      collection(db, "orders"),
      where("restaurantId", "==", restaurant.id)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "active") return ["confirmed", "pending", "preparing", "ready"].includes(o.status);
    if (activeTab === "past") return ["completed", "delivered", "picked_up"].includes(o.status);
    if (activeTab === "cancelled") return o.status === "cancelled";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 select-none">
      <CustomerHeaderNav restaurant={restaurant} slug={slug} activeTab="my-orders" />

      <main className="max-w-[900px] mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Food Orders</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track and manage your recent food orders at {restaurant.name}
            </p>
          </div>
          <Link
            href={`/@${slug}/order`}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition"
          >
            + New Order
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {(["active", "past", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab} ({orders.filter((o) => {
                if (tab === "active") return ["confirmed", "pending", "preparing", "ready"].includes(o.status);
                if (tab === "past") return ["completed", "delivered", "picked_up"].includes(o.status);
                return o.status === "cancelled";
              }).length})
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-slate-400 font-medium text-sm">
            No {activeTab} orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-slate-900 uppercase">
                      Order #{order.id.slice(-6)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {order.status || "confirmed"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    {order.orderType === "delivery" ? "🚀 Home Delivery" : "📦 Restaurant Pickup"}
                  </p>

                  <div className="text-xs font-semibold text-slate-700 pt-1">
                    {order.items?.map((it: any, i: number) => (
                      <span key={i}>
                        {it.quantity} × {it.name}{i < order.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-base font-black text-slate-900">
                    ₹{order.grandTotal || order.total || 0}
                  </span>
                  <Link
                    href={`/@${slug}/orders/${order.id}`}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex items-center gap-1"
                  >
                    Track Order <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
