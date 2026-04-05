"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Order as OrderType } from "@/types";
import { Loader2, ClipboardList, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is a placeholder for customer orders. 
    // Usually we would fetch by sessionId from localStorage
    const SESSION_KEY = "dineflow_order";
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const sessionArray = Array.isArray(parsed) ? parsed : [parsed];
      const validOrderIds = sessionArray
        .filter((s: any) => s?.orderId)
        .map((s: any) => s.orderId);

      if (validOrderIds.length > 0) {
        // Fetch the specific order or group by table if needed
        const q = query(collection(db, "orders"), where("id", "in", validOrderIds));
        return onSnapshot(q, (snap) => {
          const docs: OrderType[] = [];
          snap.forEach(d => docs.push(d.data() as OrderType));
          setOrders(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f9d6a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 max-w-[480px] mx-auto pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Orders</h1>
        <p className="text-gray-500 mt-1 text-sm">Track your delicious meal.</p>
      </header>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[24px] py-16 text-center shadow-sm">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="h-8 w-8 text-[#0f9d6a]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No active orders</h3>
          <p className="text-gray-500 max-w-xs mx-auto text-sm px-6">
            You haven't placed any orders yet. Head to the menu to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Order</span>
                    <span className="text-sm font-bold font-mono text-[#0f9d6a]">#{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                    <ClipboardList className="h-3 w-3" />
                    Table {order.tableNumber}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  order.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-emerald-50 text-[#0f9d6a] animate-pulse'
                }`}>
                  {order.status}
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex gap-2 items-center">
                      <span className="font-bold text-[#0f9d6a] bg-emerald-50 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-center">
                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Total Amount</span>
                <span className="text-xl font-black text-[#0f9d6a]">₹{order.totalAmount}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
