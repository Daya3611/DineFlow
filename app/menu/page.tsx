"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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
   INNER COMPONENT (needs Suspense wrapper for useSearchParams)
═══════════════════════════════════════════════════════════════ */
function MenuContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");
  const table = searchParams.get("table");

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [activeNav, setActiveNav] = useState<"home" | "menu" | "orders" | "profile">("menu");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, table]);

  /* ── Fetch data ── */
  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const resDoc = await getDoc(doc(db, "restaurants", restaurantId));
        if (resDoc.exists()) {
          const resData = resDoc.data() as Restaurant;
          setRestaurant(resData);
        }

        const q = query(
          collection(db, "menus"),
          where("restaurantId", "==", restaurantId)
        );
        const snap = await getDocs(q);
        const fetchedMenus: Menu[] = [];
        snap.forEach((d) => fetchedMenus.push(d.data() as Menu));
        setMenus(fetchedMenus);
      } catch {
        toast.error("Failed to load menu");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [restaurantId]);

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
    if (!restaurantId || !table) {
      toast.error("Invalid QR scan. Missing table data.");
      return;
    }
    if (Object.keys(cart).length === 0) {
      toast.error("Cart is empty");
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

      const newOrder: OrderType = {
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
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "orders", orderId), newOrder);
      saveOrderSession(newOrder);

      setActiveSessions(prev => [...prev, {
        orderId,
        tableNumber: table,
        totalAmount: finalTotal,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }]);

      // Update table to occupied
      if (!tsnap.empty) {
        await updateDoc(doc(db, "tables", tsnap.docs[0].id), { status: "occupied" });
      }

      setOrderPlaced(orderId);
      setPlacedOrderTotal(finalTotal);
      setCart({});
      setOpenCheckout(false);
      toast.success("Order placed successfully!");
    } catch {
      toast.error("Failed to place order.");
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

  /* ══════════════════════ SUBSCRIPTION EXPIRED ══════════════════════ */
  if (restaurant.subscriptionStatus !== "active") {
    return (
      <div className="menu-screen flex flex-col items-center justify-center bg-[#f8fafc] p-8 text-center">
        <div className="h-24 w-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <CheckCircle className="h-12 w-12 text-red-300 hidden" />
          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Unavailable</h1>
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-6">
          Your subscription has expired. Please renew.
        </p>
      </div>
    );
  }

  /* ══════════════════════ ORDER PLACED VIEW ══════════════════════ */
  if (orderPlaced) {
    const upiLink = restaurant.upiId
      ? `upi://pay?pa=${restaurant.upiId}&pn=${encodeURIComponent(
        restaurant.name
      )}&am=${placedOrderTotal}&cu=INR&tn=${encodeURIComponent(
        "Order " + orderPlaced.slice(-6).toUpperCase()
      )}`
      : "";

    const handleUpiDeepLink = () => {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      if (isMobile) {
        window.location.href = upiLink;
      } else {
        toast.warning(
          "UPI apps can only be opened directly on a mobile phone. Please scan the QR code."
        );
      }
    };

    return (
      <div className="menu-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 overflow-y-auto w-full h-full">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="w-20 h-20 bg-[#0f9d6a] rounded-full flex items-center justify-center mb-5 shadow-lg shadow-[0_4px_14px_rgba(15,157,106,0.2)]"
        >
          <CheckCircle className="h-10 w-10 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-1 tracking-tight">
            Order Sent! 🚀
          </h1>
          <p className="text-gray-400 text-sm text-center mb-7">
            Your food is being prepared.
          </p>

          <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden mb-4">
            {/* order id bar */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f8fafc]">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  Order ID
                </p>
                <p className="text-lg font-bold font-mono text-[#0f9d6a]">
                  #{orderPlaced.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 text-gray-600 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0f9d6a] animate-pulse" />
                Table {table}
              </div>
            </div>

            {/* payment section */}
            <div className="p-5">
              <p className="font-bold text-gray-900 text-center text-sm mb-4">
                How would you like to pay?
              </p>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <button
                  onClick={() => setPaymentOption("counter")}
                  className={`py-3 px-1 rounded-[16px] text-xs font-semibold border-2 transition-all duration-200 ${paymentOption === "counter"
                    ? "border-[#0f9d6a] bg-[#f0fdf4] text-[#0f9d6a]"
                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                >
                  At Counter
                </button>
                {restaurant.upiId ? (
                  <button
                    onClick={() => setPaymentOption("upi")}
                    className={`py-3 px-1 rounded-[16px] text-xs font-semibold border-2 transition-all duration-200 ${paymentOption === "upi"
                      ? "border-[#0f9d6a] bg-[#f0fdf4] text-[#0f9d6a]"
                      : "border-gray-100 text-gray-400 hover:border-gray-200"
                      }`}
                  >
                    Pay full (UPI)
                  </button>
                ) : (
                  <div className="py-3 px-1 rounded-[16px] text-xs font-semibold border-2 border-dashed border-gray-100 text-gray-300 text-center opacity-50 cursor-not-allowed">
                    UPI Off
                  </div>
                )}
                {restaurant.upiId ? (
                  <button
                    onClick={() => setPaymentOption("split")}
                    className={`py-3 px-1 rounded-[16px] text-xs font-semibold border-2 transition-all duration-200 ${paymentOption === "split"
                      ? "border-[#0f9d6a] bg-[#f0fdf4] text-[#0f9d6a]"
                      : "border-gray-100 text-gray-400 hover:border-gray-200"
                      }`}
                  >
                    Split Bill
                  </button>
                ) : (
                  <div className="py-3 px-1 rounded-[16px] text-xs font-semibold border-2 border-dashed border-gray-100 text-gray-300 text-center opacity-50 cursor-not-allowed">
                    Split Off
                  </div>
                )}
              </div>

              {paymentOption === "counter" && (
                <div className="bg-[#f8fafc] rounded-[16px] p-5 text-center border border-gray-100">
                  <UtensilsCrossed className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    Please pay at the cash counter after your meal.
                  </p>
                </div>
              )}

              {paymentOption === "upi" && restaurant.upiId && !paymentVerified && (
                <div className="bg-white rounded-[16px] border border-gray-100 p-5 flex flex-col items-center text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      upiLink
                    )}`}
                    alt="UPI QR"
                    className="w-36 h-36 rounded-[16px] border border-gray-100 p-2 mb-4"
                  />
                  <p className="text-xl font-extrabold text-[#0f9d6a] mb-1">
                    ₹{placedOrderTotal}
                  </p>
                  <p className="text-xs bg-gray-100 text-gray-500 font-semibold px-3 py-1 rounded-full mb-5">
                    {restaurant.upiId}
                  </p>
                  <div className="w-full space-y-3">
                    <Button
                      className="w-full bg-[#0f9d6a] hover:bg-[#0c7f56] text-white font-bold h-12 rounded-full shadow-sm shadow-[0_4px_14px_rgba(15,157,106,0.2)] transition-all active:scale-[0.98]"
                      onClick={handleUpiDeepLink}
                    >
                      Pay via UPI App
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full bg-white border-2 border-[#e5e7eb] text-[#0f172a] hover:bg-[#f1f5f9] font-bold h-12 rounded-full transition-all active:scale-[0.98]"
                      onClick={handleUpiPaid}
                      disabled={updatingPayment}
                    >
                      {updatingPayment ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        "I have paid"
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-snug">
                    Tapping "Pay via UPI App" opens your installed UPI app with
                    the exact amount pre-filled.
                  </p>
                </div>
              )}

              {paymentOption === "upi" && paymentVerified && (
                <div className="bg-[#f0fdf4] rounded-[16px] p-5 text-center border border-green-100">
                  <CheckCircle className="h-8 w-8 text-[#0f9d6a] mx-auto mb-2" />
                  <p className="text-[#0f9d6a] font-bold text-sm">
                    Payment Verification Pending
                  </p>
                  <p className="text-green-600 text-[11px] mt-1">
                    Our team will verify your payment shortly.
                  </p>
                </div>
              )}

              {paymentOption === "split" && restaurant.upiId && !paymentVerified && (
                <div className="bg-white rounded-[16px] border border-gray-100 p-5 flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-between mb-4 bg-gray-50 rounded-xl p-2 border border-gray-100">
                    <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center font-bold text-gray-600">-</button>
                    <span className="font-bold text-sm text-gray-800">Split by {splitCount}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center font-bold text-gray-600">+</button>
                  </div>

                  {(() => {
                    const splitAmount = Math.ceil(placedOrderTotal / splitCount);
                    const splitUpiLink = `upi://pay?pa=${restaurant.upiId}&pn=${encodeURIComponent(restaurant.name)}&am=${splitAmount}&cu=INR&tn=${encodeURIComponent("Split Order " + orderPlaced.slice(-6).toUpperCase())}`;
                    return (
                      <>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(splitUpiLink)}`}
                          alt="UPI QR"
                          className="w-32 h-32 rounded-[16px] border border-gray-100 p-2 mb-3"
                        />
                        <p className="text-lg font-extrabold text-[#0f9d6a] mb-0">
                          ₹{splitAmount} <span className="text-xs text-gray-400 font-medium tracking-wide">each</span>
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold mb-4 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {splitCount} payments of ₹{splitAmount} required to settle ₹{placedOrderTotal}.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full bg-white border-2 border-[#e5e7eb] text-[#0f172a] hover:bg-[#f1f5f9] font-bold h-12 rounded-full transition-all active:scale-[0.98]"
                          onClick={handleUpiPaid}
                          disabled={updatingPayment}
                        >
                          {updatingPayment ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            "Everyone Paid"
                          )}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}

              {paymentOption === "split" && paymentVerified && (
                <div className="bg-[#f0fdf4] rounded-[16px] p-5 text-center border border-green-100">
                  <CheckCircle className="h-8 w-8 text-[#0f9d6a] mx-auto mb-2" />
                  <p className="text-[#0f9d6a] font-bold text-sm">
                    Split Payments Verification Pending
                  </p>
                  <p className="text-green-600 text-[11px] mt-1">
                    Our team will verify your payments shortly.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="bg-white border-[#e5e7eb] border text-[#0f172a] hover:bg-[#f1f5f9] font-semibold text-sm rounded-full"
              onClick={() => {
                setOrderPlaced(null);
                setPaymentOption("counter");
                setPaymentVerified(false);
                // Keep the session alive — customer may want to recheck
              }}
            >
              Order something else?
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════ MAIN MENU ═══════════════════════════════ */
  return (
    <div className="menu-screen bg-white flex flex-col overflow-hidden w-full h-full">
      {/* ── TOP HEADER ── */}
      <header className="shrink-0 bg-white px-4 pt-4 pb-3">
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
              <Button className="h-8 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-3 shadow-none">
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
                  <button
                    onClick={() => {
                      setPlacedOrderTotal(session.totalAmount);
                      setOrderPlaced(session.orderId);
                    }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    View Order
                  </button>
                  <button
                    onClick={() => { clearOrderSession(session.orderId); }}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    Dismiss
                  </button>
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
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 flex items-center gap-[6px] px-4 h-[40px] rounded-full transition-all duration-200 active:scale-95 border ${isActive
                      ? "bg-[#0f9d6a] border-[#0f9d6a] text-white"
                      : "bg-[#f1f5f9] border-transparent text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <span className="text-[14px] leading-none">{getCategoryIcon(cat)}</span>
                    <span className="text-[13px] font-medium leading-none whitespace-nowrap">
                      {cat}
                    </span>
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
                                <button
                                  className="h-[28px] w-[28px] rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                  onClick={() => handleRemoveFromCart(item.id)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="font-semibold text-[13px] text-white w-5 text-center select-none">
                                  {qty}
                                </span>
                                <button
                                  className="h-[28px] w-[28px] rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                  onClick={() => handleAddToCart(item)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
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
              <button
                onClick={() => setOpenCheckout(true)}
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
              </button>
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

          <DialogFooter className="px-5 pb-5 pt-4 border-t border-gray-50 bg-white">
            <button
              disabled={submitting}
              onClick={placeOrder}
              className="w-full h-[52px] rounded-full bg-[#0f9d6a] hover:bg-[#0c7f56] text-white font-medium text-[15px] transition-all duration-200 active:scale-[0.98] shadow-[0_4px_12px_rgba(22,163,74,0.2)] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Place Order Now</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

/* ═══════════════════════════════
   ROOT EXPORT (Suspense boundary)
═══════════════════════════════ */
export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#ffffff] to-[#f8fafc]">
          <Loader2 className="animate-spin text-[#0f9d6a] h-10 w-10" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
