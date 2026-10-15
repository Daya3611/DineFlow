"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";
import { Menu, Restaurant, OrderItem, Order as OrderType } from "@/types";
import { Button } from "@/components/ui/button";
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
  ClipboardList,
  ChevronRight,
  Star,
  BellRing,
  SlidersHorizontal,
  Clock,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OrderTrackingScreen from "@/components/customer/OrderTrackingScreen";
import { YourOrdersSheet } from "@/components/customer/YourOrdersSheet";
import { FinalBillModal } from "@/components/customer/FinalBillModal";
import { ItemDetailSheet } from "@/components/customer/ItemDetailSheet";
import { Receipt } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

const ALL_LABEL = "All";

export default function ClientMenu({
  initialRestaurant,
  initialMenus,
  table,
}: {
  initialRestaurant: Restaurant;
  initialMenus: Menu[];
  table: string | null;
}) {
  const [restaurant] = useState<Restaurant>(initialRestaurant);
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const restaurantId = restaurant?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_LABEL);
  const [cart, setCart] = useState<{ [key: string]: OrderItem }>({});
  const [openCheckout, setOpenCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tableOrders, setTableOrders] = useState<OrderType[]>([]);
  const [activeNav, setActiveNav] = useState<"menu" | "orders" | "bill">("menu");
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [showYourOrdersSheet, setShowYourOrdersSheet] = useState(false);
  const [showFinalBillModal, setShowFinalBillModal] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<Menu | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // 📝 Real-time sync of restaurant menus (price, half plate, availability)
  useEffect(() => {
    if (!restaurantId) return;
    const q = query(collection(db, "menus"), where("restaurantId", "==", restaurantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const liveMenus = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            restaurantId: data.restaurantId,
            name: data.name,
            price: Number(data.price),
            hasHalfPortion: data.hasHalfPortion !== undefined ? Boolean(data.hasHalfPortion) : true,
            halfPrice: data.halfPrice !== undefined && data.halfPrice !== null ? Number(data.halfPrice) : null,
            category: data.category,
            image: data.image,
            description: data.description || "",
            dietaryTags: data.dietaryTags || [],
            highlight: data.highlight || "none",
            isAvailable: data.isAvailable !== false,
          } as Menu;
        });
        setMenus(liveMenus);
      }
    });
    return () => unsubscribe();
  }, [restaurantId]);

  // 📝 Real-time sync of active table orders
  useEffect(() => {
    if (!restaurantId || !table) return;

    const q = query(
      collection(db, "orders"),
      where("restaurantId", "==", restaurantId),
      where("tableNumber", "==", table),
      where("paymentStatus", "!=", "paid"),
      where("isActive", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as OrderType)
      );
      setTableOrders(orders.filter((o) => o.status !== "completed"));
    });

    return () => unsubscribe();
  }, [restaurantId, table]);

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
        timestamp: Date.now(),
      });
      toast.success("Waiter has been called! Someone will be right with you.");
    } catch {
      toast.error("Failed to call waiter.");
    } finally {
      setCallingWaiter(false);
    }
  };

  /* ── Cart helpers ── */
  const handleAddToCart = (item: Menu, portion: "half" | "full" = "full", qtyAdd = 1) => {
    const isExplicitlyDisabled = item.hasHalfPortion === false;
    const hasHalf = !isExplicitlyDisabled && (Boolean(item.hasHalfPortion) || (item.halfPrice !== undefined && item.halfPrice !== null));
    const halfPriceVal = item.halfPrice && Number(item.halfPrice) > 0 ? Number(item.halfPrice) : Math.round(Number(item.price) * 0.6);
    const itemPrice = portion === "half" && hasHalf ? halfPriceVal : Number(item.price);
    const itemKey = `${item.id}_${portion}`;
    const nameWithPortion = portion === "half" && hasHalf ? `${item.name} (Half)` : item.name;

    setCart((prev) => {
      const existing = prev[itemKey];
      if (existing) {
        return {
          ...prev,
          [itemKey]: { ...existing, quantity: existing.quantity + qtyAdd },
        };
      }
      return {
        ...prev,
        [itemKey]: { id: itemKey, name: nameWithPortion, price: itemPrice, quantity: qtyAdd },
      };
    });
    toast.success(`Added ${nameWithPortion} to cart`);
  };

  const handleRemoveFromCart = (itemKey: string) => {
    setCart((prev) => {
      const existing = prev[itemKey];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const n = { ...prev };
        delete n[itemKey];
        return n;
      }
      return { ...prev, [itemKey]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  /* ── Place order ── */
  const placeOrder = async () => {
    if (submitting) return;
    if (!restaurantId || !table) {
      toast.error("Invalid QR scan. Missing table session. Please rescan the QR code.");
      return;
    }
    if (Object.keys(cart).length === 0) {
      toast.error("Your cart is empty. Please add items to order.");
      return;
    }
    setSubmitting(true);
    try {
      const newItems = Object.values(cart);
      const newAmount = newItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: table,
          items: newItems,
          totalAmount: newAmount,
          customerName: customerName || "Table Guest",
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to place order");

      setCart({});
      setOpenCheckout(false);
      setShowYourOrdersSheet(true);
      toast.success("Order placed successfully! Sent to kitchen.");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [ALL_LABEL, ...Array.from(new Set(menus.map((m) => m.category)))];

  const filteredMenus = menus.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === ALL_LABEL || m.category === activeCategory;
    return matchesSearch && matchesCat && (m as any).isAvailable !== false;
  });

  const cartItemsCount = Object.values(cart).reduce((s, i) => s + i.quantity, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);

  const featuredItem = menus.find((m) => m.highlight === "bestseller") || menus[0];

  return (
    <div className="h-[100dvh] bg-slate-100 flex flex-col items-center justify-start sm:py-6 overflow-hidden">
      {/* Centered Mobile Container matching reference screenshot #1 */}
      <div className="w-full max-w-[430px] bg-[#F8FAFC] h-full sm:h-[840px] sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col border border-slate-200/60">
        {/* ── FIXED TOP HEADER matching screenshot #1 ── */}
        <header className="shrink-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 z-30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                {restaurant.name}
              </h1>
              <p className="text-[10px] font-extrabold text-[#16A34A] tracking-wider uppercase mt-0.5">
                DINEFLOW EXPERIENCE
              </p>
            </div>

            {/* Cart & Profile Badges matching screenshot #1 */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setOpenCheckout(true)}
                className="relative h-9 w-9 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center border border-emerald-100 cursor-pointer shadow-2xs"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#16A34A] text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                <User className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Search bar matching screenshot #1 */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none border border-slate-200 focus:border-[#16A34A] focus:bg-white transition-all"
            />
            <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── SCROLLABLE MENU BODY ── */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 pb-20 space-y-5">
          {/* Chef's Special / Featured Hero Card matching screenshot #1 */}
          {featuredItem && !searchQuery && activeCategory === ALL_LABEL && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">Chef's Special</h3>
                <button className="text-xs font-bold text-[#16A34A] hover:underline">
                  See all
                </button>
              </div>

              <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white h-52 w-full shadow-md group">
                <img
                  src={
                    featuredItem.image ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={featuredItem.name}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-slate-900 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#16A34A]" /> 20 min
                    </span>
                    <span className="bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white">
                      ● Non-Veg
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight">
                        {featuredItem.name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs text-slate-300 line-through">
                          ₹{Math.round(featuredItem.price * 1.3)}
                        </span>
                        <span className="text-base font-black text-emerald-400">
                          ₹{featuredItem.price}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(featuredItem)}
                      className="h-9 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs shadow-xs cursor-pointer"
                    >
                      Add to cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Pills matching screenshot #1 */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#16A34A] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Food Cards List matching screenshot #1 */}
          <div className="space-y-3">
            {filteredMenus.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-medium">
                No food items match search criteria.
              </div>
            ) : (
              filteredMenus.map((item) => {
                const itemKey = `${item.id}_full`;
                const qty = cart[itemKey]?.quantity || 0;
                const isVeg = item.dietaryTags?.includes("veg") || !item.dietaryTags?.includes("non-veg");

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDetailItem(item)}
                    className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 transition-all"
                  >
                    {/* Thumbnail Image */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80"
                        }
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`h-3 w-3 rounded-xs border flex items-center justify-center shrink-0 ${
                            isVeg ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVeg ? "bg-green-600" : "bg-red-600"
                            }`}
                          />
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {item.name}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-400 font-medium truncate mb-1">
                        {item.description || "Tender marinated herbs and spice selection."}
                      </p>

                      <p className="text-xs font-black text-slate-900">
                        {item.hasHalfPortion !== false ? (
                          <>Half / Full • <span className="text-[#16A34A]">₹{item.halfPrice && Number(item.halfPrice) > 0 ? item.halfPrice : Math.round(Number(item.price) * 0.6)} / ₹{item.price}</span></>
                        ) : (
                          <>Price • <span className="text-[#16A34A]">₹{item.price}</span></>
                        )}
                      </p>
                    </div>

                    {/* Right Stepper or Add Button */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="h-8 w-8 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center font-bold text-sm hover:bg-[#16A34A] hover:text-white transition-colors cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-[#16A34A] text-white rounded-full p-1 h-8">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(itemKey)}
                            className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-extrabold px-1">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── STICKY FLOATING CART BAR ── */}
        <AnimatePresence>
          {cartItemsCount > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 z-40"
            >
              <button
                onClick={() => setOpenCheckout(true)}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white rounded-2xl p-3.5 flex items-center justify-between shadow-lg cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-white/20 rounded-full h-7 w-7 flex items-center justify-center font-extrabold text-xs">
                    {cartItemsCount}
                  </span>
                  <span className="font-extrabold text-sm">
                    {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"} • ₹{cartTotal}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xs">
                  View Cart <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FIXED MOBILE BOTTOM NAVIGATION BAR matching screenshot #1 ── */}
        <div className="shrink-0 bg-white border-t border-slate-200/80 z-30 h-16 flex items-center justify-around px-4">
          <button
            onClick={() => setActiveNav("menu")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeNav === "menu" ? "text-[#16A34A] font-extrabold" : "text-slate-400 font-semibold"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Menu</span>
          </button>

          <button
            onClick={() => setShowYourOrdersSheet(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-[#16A34A] font-semibold transition-colors relative"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-[10px]">My Orders</span>
            {tableOrders.length > 0 && (
              <span className="absolute top-2 right-[calc(50%-12px)] h-2 w-2 rounded-full bg-[#16A34A] ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => setShowFinalBillModal(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-[#16A34A] font-semibold transition-colors"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[10px]">Bill</span>
          </button>
        </div>
      </div>

      {/* Item Details Bottom Sheet */}
      <ItemDetailSheet
        item={selectedDetailItem}
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        onAddToCart={(item, portion, qty) => handleAddToCart(item, portion, qty)}
      />

      {/* Your Orders Bottom Sheet */}
      <YourOrdersSheet
        isOpen={showYourOrdersSheet}
        onClose={() => setShowYourOrdersSheet(false)}
        orders={tableOrders}
        tableNumber={table || "1"}
        onAddMoreItems={() => {
          setActiveNav("menu");
        }}
        onViewBill={() => {
          setShowYourOrdersSheet(false);
          setShowFinalBillModal(true);
        }}
      />

      {/* Final Bill Bottom Sheet */}
      <FinalBillModal
        isOpen={showFinalBillModal}
        onClose={() => setShowFinalBillModal(false)}
        orders={tableOrders}
        tableNumber={table || "1"}
        restaurantName={restaurant.name}
        onPayNow={() => {
          toast.success("Redirecting to secure payment...");
        }}
        onRequestWaiter={handleCallWaiter}
      />

      {/* Checkout Bottom Sheet Drawer matching reference screenshots */}
      <Sheet open={openCheckout} onOpenChange={setOpenCheckout}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[85vh] max-w-[430px] mx-auto rounded-t-3xl p-5 overflow-hidden flex flex-col bg-white border-t border-slate-200"
        >
          {/* Top handle pill */}
          <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto mb-2 shrink-0" />

          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <h3 className="text-base font-extrabold text-slate-900">Review & Place Order</h3>
            <span className="text-xs font-bold text-[#16A34A] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Table {table || "1"}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[45vh] overflow-y-auto py-3 pr-1 divide-y divide-slate-100">
            {Object.values(cart).map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs font-semibold text-slate-800 pt-2 first:pt-0">
                <span className="flex items-center gap-2">
                  <span className="font-extrabold text-[#16A34A]">{item.quantity}x</span>
                  <span>{item.name}</span>
                </span>
                <span className="font-extrabold text-slate-900">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm shrink-0">
            <span className="font-extrabold text-slate-700">Total Amount</span>
            <span className="text-xl font-black text-[#16A34A]">₹{cartTotal}</span>
          </div>

          <div className="space-y-2 pt-3 shrink-0">
            <input
              type="text"
              placeholder="Your Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#16A34A]"
            />
            <input
              type="text"
              placeholder="Special instructions / notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <Button
            onClick={placeOrder}
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm shadow-xs mt-3 shrink-0 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Confirm & Place Order • ₹${cartTotal}`}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
