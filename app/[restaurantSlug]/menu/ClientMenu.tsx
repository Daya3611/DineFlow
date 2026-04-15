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
import { toast } from "sonner";
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
  BellRing,
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
  const [callingWaiter, setCallingWaiter] = useState(false);

  const handleCallWaiter = async () => {
    if (!restaurantId || !table) {
      toast.error("Invalid session. Cannot call waiter.");
      return;
    }
    setCallingWaiter(true);
    try {
      await setDoc(doc(collection(db, "waiterCalls")), {
        restaurantId,
        tableId: table,
        tableNumber: table,
        status: "pending",
        timestamp: Date.now()
      });
      toast.success("Waiter has been called! Someone will be right with you.");
    } catch {
      toast.error("Failed to call waiter.");
    } finally {
      setCallingWaiter(false);
    }
  };

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
        } catch (e) { }
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
      } catch { }
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
      toast("Order placed successfully! 🎉", {
        description: "Your order has been sent to the kitchen",
        action: {
          label: "View Order",
          onClick: () => setActiveNav("orders"),
        },
      });
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
                            <Button className="flex-1 bg-[#0f9d6a] hover:bg-[#0c7f56] text-white" onClick={handleUpiDeepLink}>
                              Pay Now
                            </Button>
                            <Button variant="outline" className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => handleUpiPaid(order.id)}
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
          <Button className="mt-6 bg-[#0f9d6a] hover:bg-[#0c7f56] text-white" onClick={() => setActiveNav("menu")}>
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
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40" style={{ height: 60 }}>
        <div className="flex items-stretch justify-around h-full">
          <button
            onClick={() => setActiveNav("menu")}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", color: activeNav === "menu" ? "#16a34a" : "#9ca3af", transition: "color 0.15s" }}
          >
            <Home size={20} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Menu</span>
          </button>

          <button
            onClick={() => setActiveNav("orders")}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", color: activeNav === "orders" ? "#16a34a" : "#9ca3af", transition: "color 0.15s", position: "relative" }}
          >
            <ClipboardList size={20} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Orders</span>
            {activeSessions.length > 0 && (
              <span style={{ position: "absolute", top: 8, right: "calc(50% - 14px)", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "2px solid white" }} />
            )}
          </button>

          <button
            onClick={handleCallWaiter}
            disabled={callingWaiter}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: callingWaiter ? "not-allowed" : "pointer", color: "#9ca3af", transition: "color 0.15s", opacity: callingWaiter ? 0.7 : 1 }}
          >
            <BellRing size={20} className={callingWaiter ? "animate-bounce text-[#0f9d6a]" : ""} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Waiter</span>
          </button>

          <button
            onClick={() => setActiveNav("help")}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", color: activeNav === "help" ? "#16a34a" : "#9ca3af", transition: "color 0.15s" }}
          >
            <Info size={20} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Help</span>
          </button>
        </div>
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
              <Button className="h-8 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors" variant="ghost">
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
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-200 text-emerald-700 bg-emerald-100 transition-colors"
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
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-2.5">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      flexShrink: 0,
                      padding: "6px 16px",
                      borderRadius: 100,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                      background: isActive ? "#16a34a" : "#f1f5f9",
                      color: isActive ? "#fff" : "#374151",
                    }}
                  >
                    {cat}
                  </button>
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
              <div key={category} className="space-y-0">
                {/* Category header */}
                <div className="flex items-center gap-3 pt-4 pb-2 px-4 sticky top-[52px] bg-white z-[5]">
                  <span className="text-base">{getCategoryIcon(category)}</span>
                  <h2 className="text-[15px] font-bold text-[#0f172a] capitalize tracking-tight">
                    {category}
                  </h2>
                  <span className="text-[12px] text-gray-400 font-medium">({items.length})</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Item cards */}
                <div style={{ borderTop: "1px solid #f8fafc" }}>
                  {items.map((item) => {
                    const qty = cart[item.id]?.quantity || 0;
                    const isBestseller = item.highlight === "bestseller";
                    const isPopular = item.highlight === "popular";
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f8fafc", gap: 12, background: "#fff" }}
                      >
                        {/* LEFT: image + text */}
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                          {/* Thumbnail */}
                          <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: "hidden", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <UtensilsCrossed style={{ width: 22, height: 22, color: "#d1d5db" }} />
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Dietary + badge row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                              {item.dietaryTags?.includes('veg') && (
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, border: "2px solid #16a34a", borderRadius: 3, flexShrink: 0 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
                                </span>
                              )}
                              {item.dietaryTags?.includes('non-veg') && (
                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, border: "2px solid #dc2626", borderRadius: 3, flexShrink: 0 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
                                </span>
                              )}
                              {(isBestseller || isPopular) && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: "#fff7ed", color: "#ea580c", padding: "2px 8px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  ⭐ {isBestseller ? "Bestseller" : "Popular"}
                                </span>
                              )}
                              {item.highlight && item.highlight !== "none" && !isBestseller && !isPopular && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: "#fefce8", color: "#a16207", padding: "2px 8px", borderRadius: 100 }}>
                                  {item.highlight}
                                </span>
                              )}
                            </div>

                            <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.3, marginBottom: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {item.name}
                            </p>

                            {item.description && (
                              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                                {item.description}
                              </p>
                            )}

                            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>₹{item.price}</p>
                          </div>
                        </div>

                        {/* RIGHT: ADD / Stepper */}
                        <div style={{ flexShrink: 0 }}>
                          <AnimatePresence mode="wait">
                            {qty === 0 ? (
                              <motion.button
                                key="add"
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ duration: 0.14 }}
                                onClick={() => handleAddToCart(item)}
                                style={{ width: 72, height: 34, borderRadius: 100, background: "#fff", border: "2px solid #16a34a", color: "#16a34a", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.01em", transition: "background 0.15s, color 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#16a34a"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#16a34a"; }}
                              >
                                + ADD
                              </motion.button>
                            ) : (
                              <motion.div
                                key="stepper"
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ duration: 0.14 }}
                                style={{ display: "flex", alignItems: "center", gap: 2, background: "#16a34a", borderRadius: 100, padding: "4px 6px", height: 34 }}
                              >
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.2)", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1 }}
                                >
                                  −
                                </button>
                                <span style={{ minWidth: 20, textAlign: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>{qty}</span>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.2)", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1 }}
                                >
                                  +
                                </button>
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

      {/* ── STICKY CART BAR ── */}
      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            style={{ position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 50, padding: "0 12px" }}
          >
            <button
              onClick={() => setOpenCheckout(true)}
              style={{
                width: "100%",
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 16,
                padding: "12px 18px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(22,163,74,0.35)",
                transition: "transform 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                  {cartItemsCount}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {cartItemsCount} item{cartItemsCount !== 1 ? "s" : ""} · ₹{cartTotal}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 14 }}>
                View Cart
                <ChevronRight size={16} style={{ opacity: 0.85 }} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl gap-0">

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between px-5 pt-5 pb-0">
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="h-[18px] w-[18px] text-[#0f9d6a]" />
                Confirm Order
              </h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Confirm your order before sending to kitchen</p>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh] px-5 pt-4 space-y-4">

            {/* ── ORDER ITEMS ── */}
            <div className="space-y-0">
              {Object.values(cart).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 border-b border-dashed border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="text-[14px] font-medium text-gray-800 truncate">{item.name}</span>
                  </div>
                  <span className="text-[14px] font-semibold text-gray-900 ml-3 shrink-0">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* ── TOTAL ── */}
            <div className="flex justify-between items-center py-3 border-t border-b border-gray-100">
              <span className="text-[14px] text-gray-500 font-medium">Total</span>
              <span className="text-[22px] font-bold text-[#0f9d6a]">₹{cartTotal}</span>
            </div>

            {/* ── INPUTS ── */}
            <div className="space-y-3 pb-2">
              <div>
                <label htmlFor="custName" className="text-[12px] font-semibold text-gray-600 mb-1.5 block">
                  👤 Your Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="custName"
                  autoFocus
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full h-[46px] px-4 rounded-xl bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 focus:border-[#0f9d6a] focus:bg-white focus:ring-2 focus:ring-green-500/10 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="note" className="text-[12px] font-semibold text-gray-600 mb-1.5 block">
                  📝 Kitchen Note <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="note"
                  placeholder="e.g. Less spicy, no onion…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 focus:border-[#0f9d6a] focus:bg-white focus:ring-2 focus:ring-green-500/10 transition-all duration-200 resize-none h-[76px]"
                />
              </div>
            </div>
          </div>

          {/* ── STICKY CTA ── */}
          <div className="px-5 pb-5 pt-3 bg-white">
            <Button
              disabled={submitting}
              onClick={placeOrder}
              className="w-full h-[52px] bg-[#0f9d6a] hover:bg-[#0c7f56] text-white text-[15px] font-bold rounded-xl shadow-[0_4px_16px_rgba(15,157,106,0.3)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Placing Order…</span>
                </>
              ) : (
                <span>Place Order · ₹{cartTotal}</span>
              )}
            </Button>
          </div>

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

