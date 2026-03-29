"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order as OrderType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Printer, CheckCircle, Clock, Utensils, UtensilsCrossed, Bell, Table, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, {
  label: string;
  color: string;
  nextAction: string | null;
  nextStatus: string | null;
  icon: React.ReactNode;
  borderColor: string;
}> = {
  pending:   { label: "New",       color: "bg-red-100 text-red-700 border-red-200",      nextAction: "Accept & Prepare",  nextStatus: "preparing", icon: <Clock className="w-3.5 h-3.5" />,          borderColor: "border-t-red-500" },
  preparing: { label: "Preparing", color: "bg-amber-100 text-amber-700 border-amber-200", nextAction: "Mark as Served",    nextStatus: "served",    icon: <Utensils className="w-3.5 h-3.5" />,        borderColor: "border-t-amber-400" },
  served:    { label: "Served",    color: "bg-sky-100 text-sky-700 border-sky-200",       nextAction: "Mark as Paid",      nextStatus: "paid",      icon: <UtensilsCrossed className="w-3.5 h-3.5" />, borderColor: "border-t-sky-400" },
  paid:      { label: "Paid",      color: "bg-emerald-100 text-emerald-700 border-emerald-200", nextAction: null,          nextStatus: null,        icon: <CheckCircle className="w-3.5 h-3.5" />,     borderColor: "border-t-emerald-500" },
};

export default function LiveOrdersPage() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [newOrderTrigger, setNewOrderTrigger] = useState(0);

  // New States for Completed Orders
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);

  const playNewOrderSound = () => {
    const audio = new Audio("/new-order.mp3");
    audio.play().catch(() => {
      console.log("User interaction required to play sound");
    });
  };

  useEffect(() => {
    if (newOrderTrigger > 0 && isSoundEnabled) {
      playNewOrderSound();
      toast.success("🔔 New order received!", { duration: 4000 });
    }
  }, [newOrderTrigger, isSoundEnabled]);

  useEffect(() => {
    if (!restaurant) return;

    setLoading(true);
    const q = query(collection(db, "orders"), where("restaurantId", "==", restaurant.id));

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

      snapshot.forEach((d) => fetchedOrders.push(d.data() as OrderType));
      fetchedOrders.sort((a, b) => b.createdAt - a.createdAt);

      setOrders(fetchedOrders);
      setLoading(false);

      if (newIncoming) {
        setNewOrderTrigger(prev => prev + 1);
      }
    }, () => {
      toast.error("Error connecting to real-time orders");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch (_) {
      toast.error("Failed to update status");
    }
  };

  const verifyPayment = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { paymentStatus: "paid" });
      toast.success("Payment verified successfully!");
    } catch (_) {
      toast.error("Failed to verify payment");
    }
  };

  const printBill = (order: OrderType) => {
    let printFrame = document.getElementById("receipt-print-frame") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "receipt-print-frame";
      Object.assign(printFrame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return toast.error("Printing not supported.");

    const itemsHtml = order.items.map(item => `
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>Rs.${item.price * item.quantity}</span>
      </div>
    `).join("");

    const r = restaurant;

    frameDoc.open();
    frameDoc.write(`
      <html><head><title>Bill - Table ${order.tableNumber}</title>
      <style>
        @page { margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 14px; max-width: 350px; margin: 0 auto; padding: 20px; color: #000; }
        h2 { text-align:center; margin:0 0 5px 0; font-size:22px; text-transform:uppercase; font-weight:900; }
        .rest-meta { text-align:center; margin-bottom:15px; font-size:12px; line-height:1.4; border-bottom:1px dashed #000; padding-bottom:15px; }
        .order-meta { margin-bottom:20px; font-size:12px; line-height:1.5; }
        .items { border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px; }
        .total { display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-bottom:20px; }
        .footer { text-align:center; font-size:12px; margin-top:20px; font-weight:bold; }
      </style></head>
      <body>
        <h2>${r?.name}</h2>
        <div class="rest-meta">
          ${r?.address ? `${r.address.replace(/\n/g, ', ')}<br>` : ""}
          ${r?.phoneNumber ? `Ph: ${r.phoneNumber}<br>` : ""}
          ${r?.gstNumber ? `GST: ${r.gstNumber}<br>` : ""}
        </div>
        <div class="order-meta">
          <b>Table: ${order.tableNumber}</b><br>
          Order #${order.id.slice(-6).toUpperCase()}<br>
          ${new Date(order.createdAt).toLocaleString()}
        </div>
        <div class="items">${itemsHtml}</div>
        <div class="total"><span>Grand Total</span><span>Rs.${order.totalAmount}</span></div>
        <div class="footer">
          Paid via: <span style="text-transform:uppercase">${order.paymentMethod || "Counter"}</span><br><br>
          Scan QR to Order &bull; Thank You!
        </div>
        <script>window.onload=()=>{setTimeout(()=>{window.print();},200);}<\/script>
      </body></html>
    `);
    frameDoc.close();
  };

  if (!restaurant) return <div className="p-8 text-center text-gray-500">Please complete restaurant setup first.</div>;

  const activeOrders = orders.filter(o => o.status !== "paid");
  
  // Completed Orders State & Filtering
  const pastOrders = orders.filter(o => o.status === "paid");
  const filteredPastOrders = pastOrders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderIdShort = order.id.slice(-6).toLowerCase();
    return orderIdShort.includes(q) || order.tableNumber.toString().includes(q);
  });

  const getPayStatusStyle = (status: string) => {
    switch(status) {
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "pending_verification": return "bg-amber-100 text-amber-700 border-amber-200 animate-pulse";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Live Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Real-time kitchen display.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isSoundEnabled) {
                const audio = new Audio("/new-order.mp3");
                audio.volume = 0;
                audio.play().catch(()=>{});
              }
              setIsSoundEnabled(!isSoundEnabled);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              isSoundEnabled ? "bg-[#0f9d6a]/10 text-[#0f9d6a] hover:bg-[#0f9d6a]/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Bell className="h-4 w-4" />
            {isSoundEnabled ? "Sound On" : "Sound Off"}
          </button>
          
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-3 py-1.5 rounded-full shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeOrders.length} active
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex justify-center items-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f9d6a]" />
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Utensils className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No active orders</h3>
          <p className="text-gray-500 max-w-xs mx-auto text-sm">New orders from your tables will appear here in real-time.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const payStatus = order.paymentStatus || "unpaid";
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className={`overflow-hidden border-t-4 shadow-sm hover:shadow-md transition-shadow bg-white ${config.borderColor} flex flex-col h-full`}>
                    <CardHeader className="pb-3 border-b bg-gray-50/80 flex flex-row items-center justify-between space-y-0 px-5 pt-4">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <Table className="h-4 w-4 text-gray-400" />
                          Table {order.tableNumber}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {order.customerName || "Guest"} · {new Date(order.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`${config.color} px-2.5 py-1 font-semibold flex items-center gap-1.5 text-xs`}>
                        {config.icon} {config.label}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col">
                      <ul className="p-5 space-y-2.5 flex-1 min-h-[100px]">
                        {order.items.map((item, i) => (
                           <li key={i} className="flex justify-between items-center text-sm">
                             <span className="text-gray-700 flex items-center gap-2">
                               <span className="inline-flex items-center justify-center h-5 w-5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">{item.quantity}</span>
                               {item.name}
                             </span>
                             <span className="text-gray-500 font-medium">₹{item.price * item.quantity}</span>
                           </li>
                        ))}
                      </ul>

                      <div className="px-5 pb-5 pt-0 space-y-4 border-t border-dashed mt-0 pt-4">
                        <div className="flex justify-between items-end">
                           <div>
                              <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Payment</div>
                              <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${getPayStatusStyle(payStatus)} px-2`}>
                                {(order.paymentMethod || "Counter").substring(0,3)} • {payStatus.replace("_", " ")}
                              </Badge>
                           </div>
                           <div className="text-right">
                             <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Total</span>
                             <span className="text-xl font-extrabold text-[#0f9d6a] block leading-none">₹{order.totalAmount}</span>
                           </div>
                        </div>

                        {payStatus === "pending_verification" && (
                          <Button 
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md shadow-amber-200"
                            onClick={() => verifyPayment(order.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Verify UPI Payment
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl bg-white border-[#e5e7eb] text-[#64748b] hover:text-[#0f9d6a] hover:bg-[#f1f5f9] h-9"
                            onClick={() => printBill(order)}
                          >
                            <Printer className="w-4 h-4 mr-1.5" /> Print Bill
                          </Button>
                          {config.nextAction && config.nextStatus && (
                            <Button
                              size="sm"
                              className={`rounded-xl text-white font-semibold h-9 ${
                              config.nextStatus === "paid" ? "bg-[#0f9d6a] hover:bg-[#0c7f56] rounded-full" : "bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full"
                              }`}
                              onClick={() => updateOrderStatus(order.id, config.nextStatus!)}
                              disabled={config.nextStatus === "paid" && payStatus === "pending_verification"}
                            >
                              {config.nextAction}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Completed Orders Section */}
      {pastOrders.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Completed Orders</h3>
              <p className="text-sm text-gray-500">History of all successfully paid orders.</p>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by Order ID or Table..." 
                className="pl-9 bg-white border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold rounded-tl-2xl">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Table</th>
                    <th className="px-6 py-4 font-semibold">Items</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Total</th>
                    <th className="px-6 py-4 font-semibold">Time</th>
                    <th className="px-6 py-4 font-semibold text-right rounded-tr-2xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPastOrders.length > 0 ? (
                    filteredPastOrders.map((o) => (
                      <tr 
                         key={o.id} 
                         className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                         onClick={() => setSelectedOrder(o)}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                          #ORD-{o.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">Table {o.tableNumber}</td>
                        <td className="px-6 py-4 text-gray-500">{o.items.reduce((a, i) => a + i.quantity, 0)} items</td>
                        <td className="px-6 py-4 text-gray-500">
                           <Badge variant="outline" className="bg-emerald-50 text-[#0f9d6a] border-emerald-200 pointer-events-none">Paid</Badge>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-gray-900">₹{o.totalAmount}</td>
                        <td className="px-6 py-4 text-gray-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 group-hover:text-[#0f9d6a] group-hover:bg-emerald-100 rounded-full transition-all">
                             <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No orders found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 gap-0 border-gray-100 shadow-xl">
          {selectedOrder && (
            <>
              <div className="bg-[#0f172a] p-6 text-white flex justify-between items-start">
                 <div>
                   <Badge className="bg-emerald-500/30 text-emerald-50 hover:bg-emerald-500/40 border-none mb-2 pointer-events-none">
                     Completed Order
                   </Badge>
                   <h2 className="text-2xl font-black font-mono tracking-tight">#ORD-{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                   <div className="flex items-center gap-2 mt-1 text-emerald-100 text-sm font-medium">
                     <Table className="h-4 w-4" /> Table {selectedOrder.tableNumber}
                     <span className="px-1">•</span>
                     <Clock className="h-4 w-4" /> {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </div>
                 </div>
              </div>
              
              <div className="p-6 bg-white space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Order Items</h4>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                          <span className="font-bold text-[#0f9d6a] bg-emerald-50 px-2 rounded-md h-6 flex items-center justify-center min-w-[28px]">{item.quantity}x</span>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-gray-500 font-medium whitespace-nowrap border-b border-gray-100 pb-2">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-semibold">Total Amount</span>
                    <span className="text-2xl font-black text-[#0f9d6a]">₹{selectedOrder.totalAmount}</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                     <div className="space-y-1">
                       <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Payment Method</span>
                       <span className="font-semibold text-gray-900 capitalize">{selectedOrder.paymentMethod || "Counter"}</span>
                     </div>
                     <div className="text-right space-y-1">
                       <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Status</span>
                       <Badge className="bg-green-100 text-green-700 border-none shadow-none pointer-events-none">Paid</Badge>
                     </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" className="rounded-xl border-gray-200 font-semibold text-gray-600 w-full hover:bg-gray-50" onClick={() => setSelectedOrder(null)}>
                     Close
                  </Button>
                  <Button 
                    className="rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 transition duration-200 w-full"
                    onClick={() => { printBill(selectedOrder); setSelectedOrder(null); }}
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print Bill
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
