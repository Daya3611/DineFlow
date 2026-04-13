import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Order as OrderType } from "@/types";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle2, Clock, Utensils, UtensilsCrossed, CheckCircle, Flame, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OrderTrackingScreen({
  orderId,
  table,
  onOrderAgain,
  onViewMenu,
  renderPaymentUI
}: {
  orderId: string;
  table: string;
  onOrderAgain?: () => void;
  onViewMenu?: () => void;
  renderPaymentUI?: (order: OrderType) => React.ReactNode;
}) {
  const [order, setOrder] = useState<OrderType | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as OrderType;
        setOrder((prev) => {
          if (prev && prev.status !== data.status && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          return data;
        });
      }
    });

    return () => unsub();
  }, [orderId]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full bg-slate-50">
        <Clock className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-500 font-medium">Fetching live order status...</p>
      </div>
    );
  }

  const STEPS = [
    { id: "pending", label: "Order Received", message: "Order received by kitchen" },
    { id: "preparing", label: "Preparing", message: "Your food is being prepared" },
    { id: "served", label: "Served", message: "Served to your table" },
  ];

  const currentStatus = order.status; // pending | preparing | served | paid
  const activeStepIndex = STEPS.findIndex((s) => s.id === currentStatus);
  const displayIndex = activeStepIndex === -1 && currentStatus === "paid" ? 2 : activeStepIndex; // paid counts as served for tracking UI
  
  const currentStepData = displayIndex >= 0 ? STEPS[displayIndex] : STEPS[0];

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full relative">
      {/* ── HEADER ── */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {onViewMenu && (
            <Button onClick={onViewMenu} className="-ml-1 text-gray-500">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Your Order</h1>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5">
              {order.tableNumber === "Takeaway" ? "Pickup Order" : `Table ${order.tableNumber}`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs bg-slate-100 border-slate-200 text-slate-500 px-2.5">
          #{order.id.slice(-6).toUpperCase()}
        </Badge>
      </header>

      <div className="flex-1 overflow-y-auto pb-[100px] p-4">
        {/* ── STATUS MESSAGE BANNER ── */}
        <motion.div
          key={currentStatus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600 rounded-[20px] p-5 mb-5 shadow-[0_8px_20px_rgba(5,150,105,0.25)] text-white text-center"
        >
          {displayIndex === 0 && <Clock className="w-10 h-10 mx-auto mb-3 text-white/90" />}
          {displayIndex === 1 && <Flame className="w-10 h-10 mx-auto mb-3 text-yellow-300" />}
          {displayIndex === 2 && <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-emerald-200" />}
          
          <h2 className="text-2xl font-extrabold tracking-tight mb-1">{currentStepData.label}</h2>
          <p className="text-emerald-100 text-sm font-medium">{currentStepData.message}</p>
        </motion.div>

        {/* ── STEPPER TRACKER ── */}
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-5 text-[15px]">Live Status</h3>
          <div className="relative pl-3">
            {/* Vertical Line */}
            <div className="absolute left-[26px] top-[24px] bottom-[24px] w-0.5 bg-gray-100 rounded-full" />
            <div 
               className="absolute left-[26px] w-0.5 bg-emerald-500 rounded-full transition-all duration-700 ease-out z-0"
               style={{ 
                 top: '24px', 
                 height: displayIndex === 0 ? '0%' : displayIndex === 1 ? '50%' : '100%' 
               }}
            />

            <ul className="space-y-6 relative z-10">
              {STEPS.map((step, index) => {
                const isActive = index === displayIndex;
                const isCompleted = index < displayIndex;
                const isPending = index > displayIndex;

                return (
                  <li key={step.id} className="flex items-start gap-4">
                    <div
                      className={`relative flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all duration-500 ${
                        isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-white border-[3px] border-emerald-500 shadow-sm" : "bg-gray-100 text-gray-300"
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                      {isActive && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                    </div>
                    <div className="flex flex-col pt-1">
                      <span className={`text-[15px] font-bold leading-none ${isActive ? "text-emerald-700" : isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                        {step.label}
                      </span>
                      {isActive && (
                        <motion.span 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          className="text-xs text-gray-500 mt-1.5 font-medium"
                        >
                          {step.message}...
                        </motion.span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ── ORDER SUMMARY CARD ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-[15px] flex justify-between items-center">
            Bill Details
            {order.paymentStatus === "paid" ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm pointer-events-none">
                Payment: Paid via {order.paymentMethod === 'upi' ? 'UPI' : 'Counter'}
              </Badge>
            ) : order.paymentStatus === "pending_verification" ? (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm pointer-events-none">
                Payment: Verifying UPI
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600 bg-gray-50 border-gray-200 shadow-sm pointer-events-none">
                Payment: Pending ({order.paymentMethod === 'upi' ? 'UPI' : 'Counter'})
              </Badge>
            )}
          </h3>
          <ul className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between items-start text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <span className="text-gray-700 flex items-start gap-3 flex-1 pr-3">
                  <span className="font-extrabold text-[12px] bg-slate-100 text-slate-700 py-0.5 px-1.5 rounded-md min-w-[24px] text-center shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="font-medium">{item.name}</span>
                </span>
                <span className="font-bold text-gray-800 shrink-0">₹{item.price * item.quantity}</span>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-200">
            <span className="font-extrabold text-gray-900">Total Bill</span>
            <span className="text-xl font-extrabold text-emerald-600">₹{order.totalAmount}</span>
          </div>
          
          {order.note && (
             <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
               <span className="text-xs font-bold text-blue-700 block mb-1 flex items-center"><Info className="w-3 h-3 mr-1"/> Your Note</span>
               <span className="text-xs text-blue-900 font-medium">{order.note}</span>
             </div>
          )}
        </div>
      </div>

      {renderPaymentUI && renderPaymentUI(order)}

      {/* ── BOTTOM ACTIONS ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
        <div className="flex gap-3 max-w-sm mx-auto">
           {(onViewMenu || onOrderAgain) && (
             <Button variant="outline" className="flex-1 h-12 text-sm text-gray-700 hover:" onClick={onOrderAgain || onViewMenu}>
                {onViewMenu ? "View Menu" : "Order Again"}
             </Button>
           )}
        </div>
      </div>
    </div>
  );
}
