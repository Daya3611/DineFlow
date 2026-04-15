"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { BellRing, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function WaiterNotificationSystem({ restaurantId }: { restaurantId: string }) {
  const [calls, setCalls] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    // Create an audio instance for notifications
    // audioRef.current = new Audio("/notification.mp3"); // Disabled temporarily (was causing 404)
    // We can also use a generic beep via AudioContext if no file exists.
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const q = query(
      collection(db, "waiterCalls"),
      where("restaurantId", "==", restaurantId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCalls = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })).sort((a: any, b: any) => b.timestamp - a.timestamp);

      setCalls(newCalls);

      if (newCalls.length > prevCount.current) {
        // Play sound for new calls
        try {
          audioRef.current?.play().catch(e => {
            // Fallback beep
            const ctx = new window.AudioContext();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.start();
            setTimeout(() => osc.stop(), 500);
          });
        } catch (e) { }

        const newest = newCalls[0];
        toast.success(`Table ${newest.tableNumber} called a waiter!`, { position: "top-right" } as any);
      }

      prevCount.current = newCalls.length;
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const markAsDone = async (callId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "waiterCalls", callId), {
        status: "resolved",
        resolvedAt: Date.now()
      });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (calls.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-4 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 overflow-hidden flex flex-col"
          >
            <div className="bg-red-500 text-white px-4 py-3 font-semibold flex justify-between items-center">
              <span>Active Waiter Calls</span>
              <button onClick={() => setIsOpen(false)}><X size={18} /></button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
              {calls.map(call => (
                <div key={call.id} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">Table {call.tableNumber}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => markAsDone(call.id, e)}
                    className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200 rounded-full flex items-center justify-center transition"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-red-500 hover:bg-red-600 rounded-full shadow-lg flex items-center justify-center text-white relative transition-transform hover:scale-105"
      >
        <BellRing className="animate-pulse" size={24} />
        <span className="absolute -top-1 -right-1 h-6 w-6 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold">
          {calls.length}
        </span>
      </button>
    </div>
  );
}
