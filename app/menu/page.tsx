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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number>(0);
  const [paymentOption, setPaymentOption] = useState<"counter" | "upi">(
    "counter"
  );
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "menu" | "orders" | "profile">("menu");

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Fetch data ── */
  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const resDoc = await getDoc(doc(db, "restaurants", restaurantId));
        if (resDoc.exists()) setRestaurant(resDoc.data() as Restaurant);

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
      const items = Object.values(cart);
      const totalAmount = items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
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
          <div className="h-[64px] w-[64px] rounded-[16px] bg-[#16a34a] flex items-center justify-center shadow-[0_8px_16px_rgba(22,163,74,0.15)] mb-5 shrink-0">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <div className="flex gap-[6px] items-center mb-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-bounce"
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
        toast.info("Please scan the QR code", {
          description: "UPI apps can only be opened directly on a mobile phone.",
        });
      }
    };

    return (
      <div className="menu-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 overflow-y-auto w-full h-full">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="w-20 h-20 bg-[#16a34a] rounded-full flex items-center justify-center mb-5 shadow-lg shadow-green-200"
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
                <p className="text-lg font-bold font-mono text-[#16a34a]">
                  #{orderPlaced.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 text-gray-600 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                Table {table}
              </div>
            </div>

            {/* payment section */}
            <div className="p-5">
              <p className="font-bold text-gray-900 text-center text-sm mb-4">
                How would you like to pay?
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setPaymentOption("counter")}
                  className={`py-3 px-2 rounded-[16px] text-sm font-semibold border-2 transition-all duration-200 ${
                    paymentOption === "counter"
                      ? "border-[#16a34a] bg-[#f0fdf4] text-[#16a34a]"
                      : "border-gray-100 text-gray-400 hover:border-gray-200"
                  }`}
                >
                  Pay at Counter
                </button>
                {restaurant.upiId ? (
                  <button
                    onClick={() => setPaymentOption("upi")}
                    className={`py-3 px-2 rounded-[16px] text-sm font-semibold border-2 transition-all duration-200 ${
                      paymentOption === "upi"
                        ? "border-[#16a34a] bg-[#f0fdf4] text-[#16a34a]"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    Pay via UPI
                  </button>
                ) : (
                  <div className="py-3 px-2 rounded-[16px] text-sm font-semibold border-2 border-dashed border-gray-100 text-gray-300 text-center opacity-50 cursor-not-allowed">
                    UPI Unavailable
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
                  <p className="text-xl font-extrabold text-[#16a34a] mb-1">
                    ₹{placedOrderTotal}
                  </p>
                  <p className="text-xs bg-gray-100 text-gray-500 font-semibold px-3 py-1 rounded-full mb-5">
                    {restaurant.upiId}
                  </p>
                  <div className="w-full space-y-3">
                    <Button
                      className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold h-12 rounded-full shadow-sm shadow-green-100 transition-all active:scale-[0.98]"
                      onClick={handleUpiDeepLink}
                    >
                      Pay via UPI App
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-200 text-[#16a34a] hover:bg-[#f0fdf4] font-bold h-12 rounded-full transition-all active:scale-[0.98]"
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
                  <CheckCircle className="h-8 w-8 text-[#16a34a] mx-auto mb-2" />
                  <p className="text-[#16a34a] font-bold text-sm">
                    Payment Verification Pending
                  </p>
                  <p className="text-green-600 text-[11px] mt-1">
                    Our team will verify your payment shortly.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              className="text-[#16a34a] hover:bg-[#f0fdf4] font-semibold text-sm rounded-full"
              onClick={() => {
                setOrderPlaced(null);
                setPaymentOption("counter");
                setPaymentVerified(false);
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
            <MapPin className="h-[18px] w-[18px] text-[#16a34a]" />
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-medium leading-tight mb-[2px]">
                Dining at
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-gray-900 leading-none truncate max-w-[150px]">
                  {restaurant.name}
                </span>
                <span className="flex items-center gap-1 bg-[#f0fdf4] text-[#16a34a] text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                  Table {table}
                </span>
              </div>
            </div>
          </div>

          {restaurant.logo ? (
            <img
              src={restaurant.logo}
              alt={restaurant.name}
              className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#16a34a] flex items-center justify-center text-white font-extrabold text-[15px] shadow-sm">
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
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
            className="w-full h-[44px] pl-[38px] pr-4 rounded-[12px] bg-[#f1f5f9] text-[14px] text-gray-800 placeholder:text-gray-400 outline-none border border-transparent focus:border-[#16a34a] focus:bg-white focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] transition-all duration-200"
          />
        </div>
      </header>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto pb-36">
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
                    className={`shrink-0 flex items-center gap-[6px] px-4 h-[40px] rounded-full transition-all duration-200 active:scale-95 border ${
                      isActive
                        ? "bg-[#16a34a] border-[#16a34a] text-white"
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
                                className="h-[36px] px-[16px] rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#16a34a] text-[13px] font-medium shadow-none transition-all duration-200 active:bg-[#16a34a] active:text-white"
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
                                className="flex items-center gap-1 border border-[#16a34a] rounded-full h-[36px] px-1 bg-[#16a34a]"
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
                className="w-full h-[56px] rounded-[16px] bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white flex items-center justify-between px-4 shadow-[0_8px_16px_rgba(22,163,74,0.25)] transition-all duration-200"
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

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-gray-100 flex items-center z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.02)] pt-1 pb-[env(safe-area-inset-bottom)]">
        {(
          [
            { id: "home", icon: Home, label: "Home" },
            { id: "menu", icon: BookOpen, label: "Menu" },
            { id: "orders", icon: ClipboardList, label: "Orders" },
            { id: "profile", icon: User, label: "Profile" },
          ] as const
        ).map(({ id, icon: Icon, label }) => {
          const isActive = activeNav === id;
          return (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className="flex-1 flex flex-col items-center justify-center gap-[4px] py-1 transition-all duration-200"
            >
              <Icon
                className={`h-[22px] w-[22px] transition-colors duration-200 ${
                  isActive ? "text-[#16a34a]" : "text-gray-400"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-[#16a34a]" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── CHECKOUT DIALOG ── */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-[24px] border-0">
          <DialogHeader className="px-5 pt-6 pb-4 border-b border-gray-50">
            <DialogTitle className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#16a34a]" />
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
                    <span className="h-[24px] w-[24px] rounded-[6px] bg-[#f0fdf4] text-[#16a34a] font-semibold text-[12px] flex items-center justify-center shrink-0">
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
              <span className="text-[18px] font-bold text-[#16a34a]">
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
                className="w-full h-[48px] px-4 rounded-[12px] bg-[#f8fafc] text-[14px] text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 focus:border-[#16a34a] focus:bg-white focus:shadow-[0_0_0_2px_rgba(22,163,74,0.1)] transition-all duration-200"
              />
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 pt-4 border-t border-gray-50 bg-white">
            <button
              disabled={submitting}
              onClick={placeOrder}
              className="w-full h-[52px] rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-medium text-[15px] transition-all duration-200 active:scale-[0.98] shadow-[0_4px_12px_rgba(22,163,74,0.2)] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
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
          <Loader2 className="animate-spin text-[#16a34a] h-10 w-10" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
