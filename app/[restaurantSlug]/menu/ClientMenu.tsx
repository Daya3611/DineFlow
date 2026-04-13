"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Menu, Restaurant, OrderItem, Order as OrderType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/lib/toast";
import {
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  CheckCircle,
  UtensilsCrossed,
  Search,
  MapPin,
  User,
  Home,
  BookOpen,
  ClipboardList,
  ChevronRight,
  Star,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import OrderTrackingScreen from "@/components/customer/OrderTrackingScreen";

/* ─────────────────────────── helpers ─────────────────────────── */
const ALL_LABEL = "All";

const CATEGORY_ICONS: Record<string, string> = {
  All: "🍽️",
  Starters: "🥗",
  Mains: "🍛",
  Breads: "🫓",
  Rice: "🍚",
  Desserts: "🍮",
  Beverages: "🥤",
  Snacks: "🍟",
  Soup: "🍜",
  Salads: "🥙",
  Seafood: "🦐",
  Biryani: "🍲",
  Pizza: "🍕",
  Burger: "🍔",
  Chinese: "🥢",
  Uncategorized: "📋",
};

function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat] ?? "🍽️";
}

/* ═══════════════════════════════════════════════════════════════
   INNER COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ClientMenu({
  initialRestaurant,
  initialMenus,
  table,
}: {
  initialRestaurant: Restaurant;
  initialMenus: Menu[];
  table: string | null;
}) {
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  
  // No loading state needed since data is pre-fetched on the server
  const [loading, setLoading] = useState(false);
  
  const restaurantId = restaurant?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_LABEL);
  const [cart, setCart] = useState<{ [key: string]: OrderItem }>({});
  const [openCheckout, setOpenCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number>(0);
  const [paymentOption, setPaymentOption] = useState<"counter" | "upi" | "split">(
    "counter"
  );
  const [splitCount, setSplitCount] = useState<number>(2);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [activeSessions, setActiveSessions] = useState<{
    orderId: string;
    tableNumber: string;
    totalAmount: number;
    expiresAt: number;
  }[]>([]);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [activeNav, setActiveNav] = useState<"menu" | "orders" | "help">("menu");

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── localStorage session helpers ── */
  const SESSION_KEY = "dineflow_order";

  const saveOrderSession = (order: OrderType) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      let sessionArray = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          sessionArray = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {}
      }
      const session = {
        orderId: order.id,
        tableNumber: order.tableNumber,
        restaurantId: order.restaurantId,
        totalAmount: order.totalAmount,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      };
      sessionArray.push(session);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionArray));
    } catch {/* ignore storage errors */ }
  };

  const clearOrderSession = (specificOrderId?: string) => {
    if (specificOrderId) {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sessionArray = Array.isArray(parsed) ? parsed : [parsed];
          const updated = sessionArray.filter((s: any) => s.orderId !== specificOrderId);
          if (updated.length > 0) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            setActiveSessions(updated);
          } else {
            localStorage.removeItem(SESSION_KEY);
            setActiveSessions([]);
          }
        }
      } catch {}
    } else {
      try { localStorage.removeItem(SESSION_KEY); setActiveSessions([]); } catch {/* ignore */ }
    }
  };

  /* ── Restore session on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const sessionArray = Array.isArray(parsed) ? parsed : [parsed];
      
      const validSessions = sessionArray.filter((session: any) => {
        if (!session?.orderId || !session?.expiresAt) return false;
        if (Date.now() > session.expiresAt) return false;
        if (restaurantId && session.restaurantId !== restaurantId) return false;
        if (table && session.tableNumber !== table) return false;
        return true;
      });

      if (validSessions.length > 0) {
        setActiveSessions(validSessions);
        // Clean up expired ones from storage
        localStorage.setItem(SESSION_KEY, JSON.stringify(validSessions));
      } else {
        localStorage.removeItem(SESSION_KEY);
        setActiveSessions([]);
      }
    } catch { clearOrderSession(); }

    const savedName = localStorage.getItem("dineflow_customer_name");
    if (savedName) setCustomerName(savedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, table]);

  /* ── Cart helpers ── */
  const handleAddToCart = (item: Menu) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing)
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 },
        };
      return {
        ...prev,
        [item.id]: { id: item.id, name: item.name, price: item.price, quantity: 1 },
      };
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const n = { ...prev };
        delete n[itemId];
        return n;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  /* ── Place order ── */
  const placeOrder = async () => {
    if (submitting) return; // Prevent double click
    if (!restaurantId || !table) {
      toast.error("Invalid QR scan. Missing table session. Please rescan the QR code.", { position: "bottom-center" });
      return;
    }
    if (Object.keys(cart).length === 0) {
      toast.error("Your cart is empty. Please add items to order.", { position: "bottom-center" });
      return;
    }
    setSubmitting(true);
    try {
      const newItems = Object.values(cart);
      const newAmount = newItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

      const orderId = `ord_${Date.now()}`;
      const finalTotal = newAmount;

      // Look up actual table object first
      let resolvedTableId = "";
      const tq = query(collection(db, "tables"), where("restaurantId", "==", restaurantId), where("tableNumber", "==", table));
      const tsnap = await getDocs(tq);
      if (!tsnap.empty) {
        resolvedTableId = tsnap.docs[0].id;
      }

      const newOrderPayload = {
        id: orderId,
        restaurantId,
        tableNumber: table,
        tableId: resolvedTableId || undefined,
        items: newItems,
        totalAmount: finalTotal,
        status: "pending",
        paymentMethod: "counter",
        paymentStatus: "unpaid",
        isActive: true,
        sessionId: `sess_${Date.now()}`,
        customerName: customerName.trim() || undefined,
        note: note.trim() || undefined,
      };

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrderPayload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      // Note: AdminDb /api/order handles updating the table state securely.

      saveOrderSession({ ...newOrderPayload, createdAt: Date.now() } as OrderType);

      if (customerName.trim()) {
        localStorage.setItem("dineflow_customer_name", customerName.trim());
      }

      setActiveSessions(prev => [...prev, {
        orderId,
        tableNumber: table,
        totalAmount: finalTotal,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }]);

      setOrderPlaced(orderId);
      setPlacedOrderTotal(finalTotal);
      setActiveNav("orders");
      setCart({});
      setOpenCheckout(false);
      toast.success("Order placed successfully! 🎉", { position: "bottom-center" });
    } catch (err: any) {
      toast.error(err.message || "Network error. Please check your internet and try again.", { position: "bottom-center" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── UPI ── */
  const handleUpiPaid = async () => {
    if (!orderPlaced) return;
    setUpdatingPayment(true);
    try {
      await setDoc(
        doc(db, "orders", orderPlaced),
        { paymentMethod: "upi", paymentStatus: "pending_verification" },
        { merge: true }
      );
      setPaymentVerified(true);
      clearOrderSession(orderPlaced); // payment submitted — session no longer needed
      toast.success("Payment sent for verification.");
    } catch {
      toast.error("Failed to update payment status.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  /* ── Derived data ── */
  const categories = [
    ALL_LABEL,
    ...Array.from(new Set(menus.map((m) => m.category || "Uncategorized"))),
  ];

  const filteredMenus = menus.filter((m) => {
    const matchCat =
      activeCategory === ALL_LABEL ||
      (m.category || "Uncategorized") === activeCategory;
    const matchSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const groupedMenus = filteredMenus.reduce((acc, menu) => {
    const cat = menu.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  const cartItemsCount = Object.values(cart).reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  const cartTotal = Object.values(cart).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  /* ══════════════════════════ LOADING ══════════════════════════ */
  if (loading) {
    return (
      <div className="menu-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#ffffff] to-[#f8fafc] w-full h-full">
        <div className="flex flex-col items-center justify-center -translate-y-[20%]">
          <div className="h-[64px] w-[64px] rounded-[16px] bg-[#0f9d6a] flex items-center justify-center shadow-[0_8px_16px_rgba(22,163,74,0.15)] mb-5 shrink-0">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <div className="flex gap-[6px] items-center mb-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[#0f9d6a] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-[14px] text-[#64748b] font-medium tracking-wide mt-[12px]">Loading menu...</p>
        </div>
      </div>
    );
  }

  /* ════════════════════════ INVALID QR ════════════════════════ */
  if (!restaurantId || !table || !restaurant) {
    return (
      <div className="menu-screen flex flex-col items-center justify-center bg-[#f8fafc] p-8 text-center">
        <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <UtensilsCrossed className="h-12 w-12 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid QR Code</h1>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Please rescan the QR code on your table to access the menu.
        </p>
      </div>
    );
  }


  /* ══════════════════════ ORDER TRACKING / PLACED VIEW ══════════════════════ */
  if (activeNav === "orders") {
    // If we have a specific order just placed or clicked
    const trackOrderId = orderPlaced || (activeSessions.length > 0 ? activeSessions[activeSessions.length - 1].orderId : null);
    
    if (trackOrderId && table) {
      const handleUpiPaid = async (orderId: string) => {
        setUpdatingPayment(true);
        try {
          await updateDoc(doc(db, "orders", orderId), {
            paymentStatus: "pending_verification",
            paymentMethod: paymentOption,
            updatedAt: Date.now(),
          });
          setPaymentVerified(true);
        } catch (err) {
          toast.error("Failed to update payment status");
        } finally {
          setUpdatingPayment(false);
        }
      };

      const renderPaymentUI = (order: OrderType) => {
        if (order.paymentStatus === "paid") return null; // Hide if already paid fully
        
        const upiLink = restaurant.upiId
          ? `upi://pay?pa=${restaurant.upiId}&pn=${encodeURIComponent(restaurant.name)}&am=${order.totalAmount}&cu=INR&tn=${encodeURIComponent("Order " + order.id.slice(-6).toUpperCase())}`
          : "";

        const handleUpiDeepLink = () => {
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.location.href = upiLink;
          } else {
            toast.warning("UPI apps can only be opened directly on a mobile phone. Please scan the QR code.");
          }
        };

        return (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mx-4 mb-24">
            <h3 className="font-bold text-gray-900 mb-4 text-[15px] flex items-center justify-between">
              How would you like to pay?
            </h3>
            
            <RadioGroup value={paymentOption} onValueChange={(val: "counter" | "upi") => setPaymentOption(val)} className="space-y-3">
              <div className={`p-4 rounded-xl border transition-all ${paymentOption === "counter" ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200"}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="counter" id="counter" className="text-emerald-600 border-gray-300 data-[state=checked]:border-emerald-600" />
                  <Label htmlFor="counter" className="font-semibold text-gray-900 flex-1 cursor-pointer">Pay at Counter</Label>
                </div>
              </div>

              {restaurant.upiId && (
                <div className={`rounded-xl border transition-all overflow-hidden ${paymentOption === "upi" ? "border-emerald-500 bg-emerald-50/20" : "border-gray-200"}`}>
                  <div className="p-4 flex items-center space-x-3 cursor-pointer" onClick={() => setPaymentOption("upi")}>
                    <RadioGroupItem value="upi" id="upi" className="text-emerald-600 border-gray-300 data-[state=checked]:border-emerald-600" />
                    <Label htmlFor="upi" className="font-semibold text-gray-900 flex-1 cursor-pointer">Pay via UPI</Label>
                  </div>
                  
                  {paymentOption === "upi" && (
                    <div className="p-4 pt-0">
                      <div className="mt-2 p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center mb-4 font-bold text-gray-900">Scan & Pay</div>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`} 
                          className="w-40 h-40 mx-auto mb-4 rounded-xl border border-gray-100 p-2 shadow-sm" 
                          alt="UPI QR" 
                        />
                        <p className="text-sm text-center text-gray-500 font-medium mb-5">
                          UPI ID: <span className="text-gray-900">{restaurant.upiId}</span>
                        </p>

                        {order.paymentStatus === "pending_verification" || paymentVerified ? (
                          <div className="bg-[#f0fdf4] rounded-xl p-4 text-center border border-green-200">
                            <CheckCircle className="h-6 w-6 text-[#0f9d6a] mx-auto mb-2" />
                            <p className="text-[#0f9d6a] font-bold text-sm">Payment Verification Pending</p>
                            <p className="text-green-600 text-[11px] mt-1">Our team will verify your payment shortly.</p>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <Button className="flex-1 hover: /50" onClick={handleUpiDeepLink}>
                              Pay Now
                            </Button>
                            <Button variant="outline" className="flex-1 text-emerald-700 hover:" onClick={() => handleUpiPaid(order.id)} 
                              disabled={updatingPayment}
                            >
                              {updatingPayment ? <Loader2 className="animate-spin h-4 w-4" /> : "I Have Paid"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </RadioGroup>
          </div>
        );
      };

      return (
        <div className="menu-screen flex flex-col h-full w-full bg-slate-50 relative pb-[70px]">
           <OrderTrackingScreen 
              orderId={trackOrderId} 
              table={table}
              onOrderAgain={() => setActiveNav("menu")}
              onViewMenu={() => setActiveNav("menu")}
              renderPaymentUI={renderPaymentUI}
           />
           {renderBottomNav()}
        </div>
      );
    }
    
    return (
      <div className="menu-screen flex flex-col h-full w-full bg-slate-50 pb-[70px]">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
           <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
           <h3 className="text-xl font-bold text-gray-800">No active orders</h3>
           <p className="text-gray-500 text-sm mt-2">When you place an order, you can track its live status here.</p>
           <Button className="mt-6 hover:" onClick={() => setActiveNav("menu")}>
             View Menu
           </Button>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  if (activeNav === "help") {
    return (
      <div className="menu-screen flex flex-col h-full w-full bg-slate-50 relative pb-[70px]">
        <header className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex items-center shadow-sm shrink-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Help & Support</h1>
        </header>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <Info className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Need Assistance?</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-xs leading-relaxed">
              Please contact our staff at the counter, or ask your waiter for assistance. We are happy to help!
            </p>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  function renderBottomNav() {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-[70px] flex items-center justify-around z-40 px-2 pb-safe bg-white/90 backdrop-blur-md">
         <Button onClick={() => setActiveNav("menu")} className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all active:scale-95 ${activeNav === "menu" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
            <Home className={`w-6 h-6 ${activeNav === "menu" ? "fill-emerald-100" : ""}`} />
            <span className="text-[10px] font-bold">Menu</span>
         </Button>
         <Button onClick={() => setActiveNav("orders")} className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all active:scale-95 relative ${activeNav === "orders" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
            <ClipboardList className={`w-6 h-6 ${activeNav === "orders" ? "fill-emerald-100" : ""}`} />
            <span className="text-[10px] font-bold">Orders</span>
            {activeSessions.length > 0 && <span className="absolute top-2 right-5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
         </Button>
         <Button onClick={() => setActiveNav("help")} className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-all active:scale-95 ${activeNav === "help" ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
            <Info className={`w-6 h-6 ${activeNav === "help" ? "fill-emerald-100" : ""}`} />
            <span className="text-[10px] font-bold">Help</span>
         </Button>
      </div>
    );
  }

  /* ═══════════════════════════════ MAIN MENU ═══════════════════════════════ */
  return (
    <div className="menu-screen bg-white flex flex-col overflow-hidden w-full h-full">
      {/* ── TOP HEADER ── */}
      <header className="shrink-0 bg-white px-4 pt-4 pb-3">
        {restaurant.subscriptionStatus !== "active" && (
          <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3 shadow-sm border border-amber-200">
            This restaurant's subscription has expired. Some features may be limited.
          </div>
        )}
        {/* Row 1: location + avatar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-[18px] w-[18px] text-[#0f9d6a]" />
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-medium leading-tight mb-[2px]">
                Dining at
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-gray-900 leading-none truncate max-w-[150px]">
                  {restaurant.name}
                </span>
                <span className="flex items-center gap-1 bg-[#f0fdf4] text-[#0f9d6a] text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0f9d6a] animate-pulse" />
                  Table {table}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/book/${restaurant.plan === "premium" && !!restaurant.customSlug ? restaurant.customSlug : restaurantId}`}>
              <Button className="h-8 text-xs text-emerald-700 hover:">
                <BookOpen className="w-3 h-3 mr-1" /> Book Table
              </Button>
            </Link>
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#0f9d6a] flex items-center justify-center text-white font-extrabold text-[15px] shadow-sm">
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Search bar */}
        <div className="relative">
          <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search dishes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[44px] pl-[38px] pr-4 rounded-[12px] bg-[#f1f5f9] text-[14px] text-gray-800 placeholder:text-gray-400 outline-none border border-transparent focus:border-[#0f9d6a] focus:bg-white focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] transition-all duration-200"
          />
        </div>
      </header>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto pb-36">

        {/* ── Active Order Recovery Banner ── */}
        {!sessionDismissed && !orderPlaced && activeSessions.map(session => (
          <div key={session.orderId} className="mx-4 mt-3 mb-1">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardList className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-emerald-900 leading-snug">You have an active order</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Order #{session.orderId.slice(-6).toUpperCase()} · Table {session.tableNumber} · ₹{session.totalAmount}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <Button onClick={() => {
                      setPlacedOrderTotal(session.totalAmount);
                      setOrderPlaced(session.orderId);
                    }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    View Order
                  </Button>
                  <Button onClick={() => { clearOrderSession(session.orderId); }}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Category chips */}
        {categories.length > 1 && (
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 pt-1 pb-3">
            <div className="flex gap-[8px] overflow-x-auto hide-scrollbar">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <Button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 flex items-center gap-[6px] px-4 h-[40px] rounded-full transition-all duration-200 active:scale-95 border ${isActive
                      ? "bg-[#0f9d6a] border-[#0f9d6a] text-white"
                      : "bg-[#f1f5f9] border-transparent text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <span className="text-[14px] leading-none">{getCategoryIcon(cat)}</span>
                    <span className="text-[13px] font-medium leading-none whitespace-nowrap">
                      {cat}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="px-4 pt-1 pb-6 space-y-6">
          {Object.keys(groupedMenus).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <UtensilsCrossed className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium text-sm">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No items available right now."}
              </p>
            </div>
          ) : (
            Object.entries(groupedMenus).map(([category, items]) => (
              <div key={category} className="space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-3 pt-2">
                  <h2 className="text-[15px] font-medium text-[#0f172a] capitalize tracking-tight flex items-center gap-2">
                    {category}
                  </h2>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Item cards */}
                <div className="space-y-[12px]">
                  {items.map((item) => {
                    const qty = cart[item.id]?.quantity || 0;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-[16px] border border-gray-100 p-[12px] flex gap-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-gray-200 transition-all duration-200"
                      >
                        {/* Thumbnail */}
                        <div className="h-[64px] w-[64px] rounded-[12px] bg-[#f8fafc] border border-gray-50 flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UtensilsCrossed className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="text-[14px] font-medium text-gray-900 leading-snug line-clamp-2 max-w-[90%]">
                            {item.name}
                          </h3>
                          {item.category && (
                            <p className="text-[12px] text-gray-500 mt-0.5 mb-1.5 line-clamp-1">
                              {item.category}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-0.5 mb-1.5">
                            {item.highlight && item.highlight !== "none" && (
                              <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm shrink-0">
                                *{item.highlight}
                              </span>
                            )}
                            {item.dietaryTags?.map(tag => (
                              <span key={tag} className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm border shrink-0 ${tag === 'veg' ? 'bg-green-50 text-green-700 border-green-200' : tag === 'non-veg' ? 'bg-red-50 text-red-700 border-red-200' : tag === 'vegan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-[14px] font-semibold text-gray-900 mt-auto">
                            ₹{item.price}
                          </p>
                        </div>

                        {/* Add / Stepper */}
                        <div className="flex-shrink-0 flex items-center self-center">
                          <AnimatePresence mode="wait">
                            {qty === 0 ? (
                              <motion.button
                                key="add"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => handleAddToCart(item)}
                                className="h-[36px] px-[16px] rounded-full bg-[#f0fdf4] text-[#0f9d6a] border border-[#0f9d6a] text-[13px] font-medium shadow-none transition-all duration-200 active:bg-[#0f9d6a] active:text-white"
                              >
                                Add
                              </motion.button>
                            ) : (
                              <motion.div
                                key="stepper"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1 border border-[#0f9d6a] rounded-full h-[36px] px-1 bg-[#0f9d6a]"
                              >
                                <Button className="h-[28px] w-[28px] flex items-center justify-center hover:/20" onClick={() => handleRemoveFromCart(item.id)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="font-semibold text-[13px] text-white w-5 text-center select-none">
                                  {qty}
                                </span>
                                <Button className="h-[28px] w-[28px] flex items-center justify-center hover:/20" onClick={() => handleAddToCart(item)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── FLOATING CART BAR ── */}
      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="fixed bottom-[80px] left-0 right-0 px-4 z-50 pointer-events-none"
          >
            <div className="max-w-[448px] mx-auto pointer-events-auto">
              <Button onClick={() => setOpenCheckout(true)}
                className="w-full h-[56px] rounded-[16px] bg-[#0f9d6a] hover:bg-[#0c7f56] active:scale-[0.98] text-white flex items-center justify-between px-4 shadow-[0_8px_16px_rgba(22,163,74,0.25)] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 h-9 w-9 rounded-full flex items-center justify-center font-bold text-[14px]">
                    {cartItemsCount}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[14px] leading-tight">View Cart</p>
                    <p className="text-white/80 text-[11px] font-medium mt-[2px]">
                      {cartItemsCount} item{cartItemsCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[2px]">
                  <span className="font-bold text-[16px]">₹{cartTotal}</span>
                  <ChevronRight className="h-5 w-5 opacity-80" />
                </div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-[24px] border-0">
          <DialogHeader className="px-5 pt-6 pb-4 border-b border-gray-50">
            <DialogTitle className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#0f9d6a]" />
              Confirm Order
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-[13px] mt-1.5">
              Review your items before sending to kitchen.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 overflow-y-auto max-h-[55vh]">
            <div className="space-y-[12px]">
              {Object.values(cart).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-[14px] pb-3 border-b border-dashed border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="h-[24px] w-[24px] rounded-[6px] bg-[#f0fdf4] text-[#0f9d6a] font-semibold text-[12px] flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                    <span className="font-medium text-gray-800 line-clamp-1">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 ml-3">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between bg-[#f8fafc] rounded-[16px] px-4 py-[14px] border border-gray-100">
              <span className="font-semibold text-gray-900 text-[14px]">Total Amount</span>
              <span className="text-[18px] font-bold text-[#0f9d6a]">
                ₹{cartTotal}
              </span>
            </div>

            <div className="mt-6 space-y-[8px]">
              <Label htmlFor="custName" className="text-[13px] font-semibold text-gray-900">
                Your Name <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <input
                id="custName"
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full h-[48px] px-4 rounded-[12px] bg-[#f8fafc] text-[14px] text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 focus:border-[#0f9d6a] focus:bg-white focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] transition-all duration-200"
              />
            </div>

            <div className="mt-4 space-y-[8px]">
              <Label htmlFor="note" className="text-[13px] font-semibold text-gray-900">
                Custom Note <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <textarea
                id="note"
                placeholder="Add note (less spicy, no onion, etc)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-3 rounded-[12px] bg-[#f8fafc] text-[14px] text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 focus:border-[#0f9d6a] focus:bg-white focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] transition-all duration-200 resize-none h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 pt-4 border-t border-gray-50 bg-white sticky bottom-0">
            <Button disabled={submitting} onClick={placeOrder} className="w-full h-[52px] bg-[#0f9d6a] [#0c7f56] text-[15px] [0.98] shadow-[0_4px_12px_rgba(22,163,74,0.2)] disabled:opacity-70 disabled: flex items-center justify-center ga">
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Placing Order...
                </>
              ) : (
                <>Place Order Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RENDER BOTTOM NAV FOR NON-TRACKING SCREENS TOO ── */}
      {renderBottomNav()}

      {/* hide native scrollbar for category row */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .menu-screen { height: 100svh; max-width: 480px; margin: 0 auto; position: relative; }
        @media (min-width: 481px) {
          .menu-screen { box-shadow: 0 0 0 1px #e5e7eb, 0 8px 40px rgba(0,0,0,0.10); }
        }
      `}</style>
    </div>
  );
}

