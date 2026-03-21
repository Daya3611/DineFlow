"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { Menu, Restaurant, OrderItem, Order as OrderType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingBag, CheckCircle, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function MenuContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");
  const table = searchParams.get("table");

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: OrderItem }>({});
  const [openCheckout, setOpenCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number>(0);

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const resDoc = await getDoc(doc(db, "restaurants", restaurantId));
        if (resDoc.exists()) setRestaurant(resDoc.data() as Restaurant);

        const q = query(collection(db, "menus"), where("restaurantId", "==", restaurantId));
        const querySnapshot = await getDocs(q);
        const fetchedMenus: Menu[] = [];
        querySnapshot.forEach((d) => fetchedMenus.push(d.data() as Menu));
        setMenus(fetchedMenus);
      } catch (_) {
        toast.error("Failed to load menu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  const handleAddToCart = (item: Menu) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (existing) return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 } };
      return { ...prev, [item.id]: { id: item.id, name: item.name, price: item.price, quantity: 1 } };
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity === 1) { const n = { ...prev }; delete n[itemId]; return n; }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const placeOrder = async () => {
    if (!restaurantId || !table) { toast.error("Invalid QR scan. Missing table data."); return; }
    if (Object.keys(cart).length === 0) { toast.error("Cart is empty"); return; }

    setSubmitting(true);
    try {
      const items = Object.values(cart);
      const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const orderId = `ord_${Date.now()}`;

      const newOrder: OrderType = {
        id: orderId,
        restaurantId,
        tableNumber: table,
        items,
        totalAmount,
        status: "pending",
        paymentMethod: "counter",
        paymentStatus: "unpaid",
        customerName: customerName.trim() || undefined,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "orders", orderId), newOrder);
      setOrderPlaced(orderId);
      setPlacedOrderTotal(totalAmount);
      setCart({});
      setOpenCheckout(false);
    } catch (_) {
      toast.error("Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const [paymentOption, setPaymentOption] = useState<"counter" | "upi">("counter");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);

  const handleUpiPaid = async () => {
    if (!orderPlaced) return;
    setUpdatingPayment(true);
    try {
      await setDoc(doc(db, "orders", orderPlaced), {
        paymentMethod: "upi",
        paymentStatus: "pending_verification"
      }, { merge: true });
      setPaymentVerified(true);
      toast.success("Payment sent for verification.");
    } catch (_) {
      toast.error("Failed to update payment status.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECFDF5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg animate-pulse">
            <UtensilsCrossed className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (!restaurantId || !table || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ECFDF5] p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <UtensilsCrossed className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Invalid QR Code</h1>
        <p className="text-gray-500 mt-2 max-w-xs">Please rescan the QR code on your table to access the menu.</p>
      </div>
    );
  }

  if (orderPlaced) {
    const upiLink = restaurant.upiId 
      ? `upi://pay?pa=${restaurant.upiId}&pn=${encodeURIComponent(restaurant.name)}&am=${placedOrderTotal}`
      : "";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ECFDF5] p-6 pt-12 pb-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200"
        >
          <CheckCircle className="h-10 w-10 text-white" />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center mb-2">Order Sent! 🚀</h1>
          <p className="text-gray-500 text-base text-center mb-8">Your food is being prepared.</p>
          
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Order ID</div>
                <div className="text-xl font-bold font-mono text-emerald-600">#{orderPlaced.slice(-6).toUpperCase()}</div>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Table {table}
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-center">How would you like to pay?</h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => setPaymentOption("counter")}
                  className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${paymentOption === "counter" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
                >
                  Pay at Counter
                </button>
                {restaurant.upiId ? (
                  <button 
                    onClick={() => setPaymentOption("upi")}
                    className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${paymentOption === "upi" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
                  >
                    Pay via UPI
                  </button>
                ) : (
                  <div className="py-3 px-2 rounded-xl text-sm font-bold border-2 border-dashed border-gray-100 text-gray-300 text-center opacity-50 cursor-not-allowed">
                    UPI Unavailable
                  </div>
                )}
              </div>

              {paymentOption === "counter" && (
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                  <UtensilsCrossed className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium text-sm">Please pay at the cash counter after your meal.</p>
                </div>
              )}

              {paymentOption === "upi" && restaurant.upiId && !paymentVerified && (
                <div className="bg-white rounded-2xl border-2 border-emerald-100 p-6 flex flex-col items-center text-center">
                   <div className="mb-4">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`} alt="UPI QR" className="w-36 h-36 rounded-xl border border-gray-100 shadow-sm p-2" />
                   </div>
                   <div className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 mb-5">{restaurant.upiId}</div>
                   
                   <a 
                     href={upiLink} 
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-sm"
                   >
                     Pay ₹{placedOrderTotal} via UPI App
                   </a>

                   <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
                    onClick={handleUpiPaid}
                    disabled={updatingPayment}
                   >
                     {updatingPayment ? <Loader2 className="animate-spin h-5 w-5" /> : "I have paid"}
                   </Button>
                </div>
              )}

              {paymentOption === "upi" && paymentVerified && (
                 <div className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-200">
                   <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                   <p className="text-emerald-800 font-bold text-sm">Payment Verification Pending</p>
                   <p className="text-emerald-600 text-xs mt-1">Our team will verify the payment shortly.</p>
                 </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              className="text-emerald-600 hover:bg-emerald-50 font-semibold"
              onClick={() => { setOrderPlaced(null); setPaymentOption("counter"); setPaymentVerified(false); }}
            >
              Order something else?
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const groupedMenus = menus.reduce((acc, menu) => {
    const cat = menu.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  const cartItemsCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F0FDF4] pb-36">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-teal-800 relative pt-12 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border-2 border-white" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full border-2 border-white" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-20 h-20 rounded-2xl bg-white object-cover border-4 border-white/30 shadow-2xl mb-5" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-emerald-400 text-white flex items-center justify-center font-extrabold text-3xl mb-5 shadow-2xl border-4 border-white/20">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{restaurant.name}</h1>
          <div className="mt-3 flex items-center gap-2 bg-white/20 backdrop-blur text-white text-sm font-semibold px-4 py-1.5 rounded-full">
            <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            Table {table}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto -mt-6 space-y-8">
        {Object.keys(groupedMenus).length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            No items available right now.
          </div>
        ) : (
          Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider shrink-0">{category}</h2>
                <div className="h-px bg-emerald-200 flex-1" />
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const qty = cart[item.id]?.quantity || 0;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 items-center hover:border-emerald-200 transition-colors"
                    >
                      <div className="h-20 w-20 rounded-xl bg-emerald-50 shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <UtensilsCrossed className="h-7 w-7 text-emerald-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{item.name}</h3>
                        <div className="font-extrabold text-emerald-600 text-base">₹{item.price}</div>
                      </div>
                      <div className="shrink-0">
                        {qty === 0 ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all active:scale-95 shadow-sm shadow-emerald-200"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 border-2 border-emerald-600 rounded-xl h-9 px-1">
                            <button
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors"
                              onClick={() => handleRemoveFromCart(item.id)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-bold text-sm text-emerald-700 w-5 text-center">{qty}</span>
                            <button
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors"
                              onClick={() => handleAddToCart(item)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Bar */}
      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-50"
          >
            <div className="max-w-md mx-auto">
              <button
                className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center justify-between px-5 shadow-2xl shadow-emerald-600/40 transition-all"
                onClick={() => setOpenCheckout(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 h-9 w-9 rounded-xl flex items-center justify-center font-bold text-base">
                    {cartItemsCount}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-base leading-tight">View Cart</div>
                    <div className="text-emerald-200 text-xs">{cartItemsCount} item{cartItemsCount !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="font-extrabold text-xl">₹{cartTotal}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Dialog */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-emerald-50">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Confirm Order
            </DialogTitle>
            <DialogDescription>Review your items before sending to kitchen.</DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-3">
              {Object.values(cart).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                    <span className="font-medium text-gray-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 ml-3">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-2xl font-extrabold text-emerald-600">₹{cartTotal}</span>
            </div>

            <div className="mt-5 space-y-1.5">
              <Label htmlFor="custName" className="text-sm font-medium text-gray-700">Your Name (Optional)</Label>
              <Input
                id="custName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
                className="h-11 rounded-xl border-gray-200 bg-white focus:border-emerald-400"
              />
            </div>
          </div>

          <DialogFooter className="p-5 border-t bg-gray-50">
            <Button
              className="w-full h-13 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all"
              disabled={submitting}
              onClick={placeOrder}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🚀 Place Order Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#ECFDF5]">
        <Loader2 className="animate-spin text-emerald-600 h-10 w-10" />
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
