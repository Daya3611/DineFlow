"use client";

import { useState } from "react";
import { db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Order as OrderType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Loader2, CheckCircle, Clock, Utensils, ShoppingBag, Eye, Phone, Mail, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, {
  label: string;
  color: string;
  nextAction: string | null;
  nextStatus: string | null;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", nextAction: "Mark as Preparing", nextStatus: "preparing", borderColor: "border-t-amber-400", icon: <Clock className="w-3.5 h-3.5" /> },
  preparing: { label: "Preparing", color: "bg-sky-100 text-sky-700 border-sky-200", nextAction: "Mark as Ready", nextStatus: "ready", borderColor: "border-t-sky-400", icon: <Utensils className="w-3.5 h-3.5" /> },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-700 border-emerald-200", nextAction: "Complete Order", nextStatus: "completed", borderColor: "border-t-emerald-500", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700 border-gray-200", nextAction: null, nextStatus: null, borderColor: "border-t-gray-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

export function TakeawayOrders({ takeaways }: { takeaways: OrderType[] }) {
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updateData: any = { 
        status: newStatus,
        updatedAt: Date.now()
      };
      
      if (newStatus === "completed") {
         updateData.isActive = false; // Mark complete
         if (takeaways.find(o => o.id === orderId)?.paymentMethod === "cod") {
            updateData.paymentStatus = "paid";
         }
      }
      
      await setDoc(doc(db, "orders", orderId), updateData, { merge: true });
      toast.success(`Order marked as ${newStatus}`);
      
      if (newStatus === "completed") {
         setSelectedOrder(null);
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const verifyUpiPayment = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await setDoc(doc(db, "orders", orderId), {
        paymentStatus: "paid",
        updatedAt: Date.now()
      }, { merge: true });
      toast.success("Payment verified manually.");
    } catch (err) {
      toast.error("Failed to verify payment");
    } finally {
      setUpdatingId(null);
    }
  };

  // The single source of truth is passed as props; we update selectedOrder if it changes.
  const activeOrder = selectedOrder ? takeaways.find(o => o.id === selectedOrder.id) : null;
  const currentSheetOrder = activeOrder || selectedOrder;

  const activeOrders = takeaways.filter(o => o.status !== "completed");
  const completedOrders = takeaways.filter(o => o.status === "completed").slice(0, 50);

  const isUrgent = (createdAt: number) => (Date.now() - createdAt) > 20 * 60 * 1000;

  return (
    <div className="space-y-6 pt-4">
      {/* Grid of Cards */}
      {activeOrders.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl py-20 text-center">
           <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
             <ShoppingBag className="h-8 w-8 text-emerald-400" />
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-1">No pending takeaways</h3>
           <p className="text-gray-500 text-sm">Orders will appear here instantly when placed online.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeOrders.map((order) => {
              const cfg = statusConfig[order.status] || statusConfig.pending;
              const urgent = isUrgent(order.createdAt) && order.status !== "ready";
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className={`overflow-hidden border-t-4 bg-white shadow-sm hover:shadow-md transition-shadow relative ${cfg.borderColor} ${urgent ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
                    {urgent && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10 animate-pulse">URGENT</div>}
                    <CardHeader className="pb-3 border-b bg-slate-50/50 px-5 pt-4">
                      <div className="flex justify-between items-start gap-4">
                         <div>
                           <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                             {order.customerName || "Customer"} 
                           </CardTitle>
                           <CardDescription className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> {order.customerPhone || "N/A"}
                           </CardDescription>
                         </div>
                         <Badge variant="outline" className={`${cfg.color} shrink-0 pr-3`}>
                           {cfg.icon} <span className="ml-1.5">{cfg.label}</span>
                         </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 py-4 flex flex-col gap-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-semibold">Pickup:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">{order.pickupTime || "ASAP"}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-semibold">Items:</span>
                        <span className="font-bold text-slate-700">{order.items.reduce((a, b) => a + b.quantity, 0)} items</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-semibold">Total:</span>
                        <span className="font-extrabold text-[#0f9d6a] text-lg">₹{order.totalAmount}</span>
                      </div>

                      <Button variant="outline" onClick={() => setSelectedOrder(order)} 
                        className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 mt-1"
                      >
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Completed Takeaway Log */}
      {completedOrders.length > 0 && (
         <div className="mt-12 pt-8 border-t border-gray-200">
           <h3 className="text-xl font-bold text-slate-900 mb-6">Completed Takeaways</h3>
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Order ID</th>
                       <th className="px-6 py-4 font-semibold">Customer</th>
                       <th className="px-6 py-4 font-semibold">Items</th>
                       <th className="px-6 py-4 font-semibold">Total</th>
                       <th className="px-6 py-4 font-semibold text-right">View</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {completedOrders.map((o) => (
                       <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                          <td className="px-6 py-4 font-mono font-bold text-slate-500">#ORD-{o.id.slice(-6).toUpperCase()}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{o.customerName}</td>
                          <td className="px-6 py-4 text-slate-500">{o.items.length}</td>
                          <td className="px-6 py-4 font-extrabold text-slate-900">₹{o.totalAmount}</td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 text-emerald-600"><Eye className="w-4 h-4" /></Button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
           </div>
         </div>
      )}

      <Sheet open={!!currentSheetOrder} onOpenChange={(val) => !val && setSelectedOrder(null)}>
        <SheetContent side="right" className="w-[400px] sm:max-w-md p-0 flex flex-col bg-white">
          {currentSheetOrder && (() => {
            const cfg = statusConfig[currentSheetOrder.status] || statusConfig.pending;
            return (
              <>
                <SheetHeader className="p-6 border-b border-slate-100 text-left shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className={`${cfg.color} pr-3`}>
                      {cfg.icon} <span className="ml-1.5">{cfg.label}</span>
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">#ORD-{currentSheetOrder.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <SheetTitle className="text-2xl font-black text-slate-900">Order Details</SheetTitle>
                  <SheetDescription>
                    Placed on {new Date(currentSheetOrder.createdAt).toLocaleDateString()} at {new Date(currentSheetOrder.createdAt).toLocaleTimeString()}
                  </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                  {/* SECTION 1: Customer Info */}
                  <div className="space-y-4 mb-8">
                     <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Customer Info</h4>
                     <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                           <div className="bg-slate-200 text-slate-600 rounded-full h-8 w-8 flex justify-center items-center font-bold text-sm">
                             {currentSheetOrder.customerName?.charAt(0) || "G"}
                           </div>
                           <span className="font-semibold text-slate-900">{currentSheetOrder.customerName || "Takeaway Guest"}</span>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-2.5 px-1">
                           <div className="flex items-center gap-2 text-sm">
                              <PhoneCall className="w-4 h-4 text-slate-400" /> 
                              <span className="font-medium text-slate-700">{currentSheetOrder.customerPhone || "N/A"}</span>
                           </div>
                           <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-slate-400" /> 
                              <span className="font-medium text-slate-700">{currentSheetOrder.customerEmail || "N/A"}</span>
                           </div>
                           <div className="flex items-center gap-2 text-sm mt-1">
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border border-green-200"><CheckCircle className="w-3.5 h-3.5 mr-1" /> OTP Verified</Badge>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* SECTION 2: Order Items */}
                  <div className="space-y-4 mb-8">
                     <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Order Items</h4>
                     <div className="space-y-3">
                       {currentSheetOrder.items.map((item, id) => (
                          <div key={id} className="flex justify-between items-start text-sm">
                            <span className="text-slate-900 font-semibold"><span className="text-emerald-600 font-bold mr-2">{item.quantity}x</span> {item.name}</span>
                            <span className="font-bold text-slate-700">₹{item.price * item.quantity}</span>
                          </div>
                       ))}
                     </div>
                  </div>

                  {/* SECTION 3: Order Info */}
                  <div className="space-y-4 mb-4">
                     <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Order Info</h4>
                     <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-600">Pickup Time</span>
                          <Badge className="bg-emerald-200 text-emerald-800 hover:bg-emerald-200 font-bold uppercase">{currentSheetOrder.pickupTime}</Badge>
                        </div>
                        <Separator className="bg-emerald-200/50" />
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-semibold text-slate-600">Payment</span>
                           {currentSheetOrder.paymentStatus === 'paid' ? 
                             <Badge className="bg-[#16a34a] pointer-events-none uppercase">Paid</Badge> :
                             <span className="text-amber-600 font-bold uppercase text-xs animate-pulse bg-amber-100 px-2 py-0.5 rounded">Unpaid ({currentSheetOrder.paymentMethod})</span>
                           }
                        </div>
                        <Separator className="bg-emerald-200/50" />
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-bold text-slate-900">Total</span>
                          <span className="font-black text-[#0f9d6a]">₹{currentSheetOrder.totalAmount}</span>
                        </div>
                     </div>
                     {currentSheetOrder.paymentStatus === "pending_verification" && currentSheetOrder.status !== "completed" && (
                       <Button variant="default" className="w-full hover:" onClick={() => verifyUpiPayment(currentSheetOrder.id)}>
                         {updatingId === currentSheetOrder.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} Verify UPI Payment Now
                       </Button>
                     )}
                     {currentSheetOrder.paymentStatus === "unpaid" && currentSheetOrder.paymentMethod === "cod" && currentSheetOrder.status !== "completed" && (
                       <Button variant="outline" className="w-full text-emerald-700" onClick={() => verifyUpiPayment(currentSheetOrder.id)}>
                         {updatingId === currentSheetOrder.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} Payment received at counter
                       </Button>
                     )}
                  </div>
                </ScrollArea>

                {/* SECTION 4: Status Control (Fixed at bottom) */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                   <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Take Action</h4>
                   <div className="grid grid-cols-1 gap-2">
                     {currentSheetOrder.status === 'pending' && (
                       <Button onClick={() => updateOrderStatus(currentSheetOrder.id, "preparing")} disabled={updatingId === currentSheetOrder.id} className="w-full h-12 text-[15px] font-bold rounded-xl bg-sky-500 hover:bg-sky-600 shadow-md">
                         Start Preparing Order
                       </Button>
                     )}
                     {currentSheetOrder.status === 'preparing' && (
                       <Button onClick={() => updateOrderStatus(currentSheetOrder.id, "ready")} disabled={updatingId === currentSheetOrder.id} className="w-full h-12 text-[15px] font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-md">
                         Mark as Ready For Pickup
                       </Button>
                     )}
                     {currentSheetOrder.status === 'ready' && (
                       <Button onClick={() => updateOrderStatus(currentSheetOrder.id, "completed")} disabled={updatingId === currentSheetOrder.id} className="w-full h-12 text-[15px] font-bold rounded-xl bg-slate-900 hover:bg-slate-800 shadow-xl">
                         Complete & Dismiss
                       </Button>
                     )}
                     {currentSheetOrder.status === 'completed' && (
                       <div className="text-center py-2 text-sm text-slate-500 font-semibold bg-white rounded-xl border border-slate-100">
                         This order is completed
                       </div>
                     )}
                   </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
