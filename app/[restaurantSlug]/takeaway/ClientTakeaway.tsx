"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed, ShoppingBag, ChevronRight,
  CheckCircle, Loader2, Search, Minus, Plus, Star, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Category emoji map ─────────────────────────────────────── */
const CAT_ICONS: Record<string, string> = {
  All: "🍽️", Starters: "🥗", Mains: "🍛", Breads: "🫓", Rice: "🍚",
  Desserts: "🍮", Beverages: "🥤", Snacks: "🍟", Breakfast: "🥞",
  Pizza: "🍕", Burger: "🍔", Chinese: "🥢", Soup: "🍜", Seafood: "🦐",
  Biryani: "🍲", "Fast Food": "🍟", Salads: "🥙",
};
const catIcon = (cat: string) => CAT_ICONS[cat] ?? "🍽️";

/* ─── Types ──────────────────────────────────────────────────── */
type CartItem = { id: string; name: string; price: number; quantity: number };
type PickupOption = "ASAP" | "30 min" | "45 min" | "Custom";
type PayOpt = "cod" | "upi";

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ClientTakeaway({
  initialRestaurant,
  initialMenus,
}: {
  initialRestaurant: Restaurant;
  initialMenus: Menu[];
}) {
  const router = useRouter();
  const catBarRef = useRef<HTMLDivElement>(null);

  /* ── Auth ── */
  const [authStep, setAuthStep] = useState<"details" | "otp" | "authenticated">("details");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [timer, setTimer] = useState(0);

  /* ── Menu / Cart ── */
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [openCheckout, setOpenCheckout] = useState(false);
  const [paymentOption, setPaymentOption] = useState<PayOpt>("cod");
  const [pickupTime, setPickupTime] = useState<PickupOption>("ASAP");
  const [customTime, setCustomTime] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  /* ── Restore session ── */
  useEffect(() => {
    const e = localStorage.getItem(`takeaway_email_${initialRestaurant.id}`);
    const n = localStorage.getItem(`takeaway_name_${initialRestaurant.id}`);
    const p = localStorage.getItem(`takeaway_phone_${initialRestaurant.id}`);
    if (e && n && p) { setEmail(e); setFullName(n); setPhoneNumber(p); setAuthStep("authenticated"); }
  }, [initialRestaurant.id]);

  useEffect(() => {
    if (initialMenus.length > 0) {
      const cats = Array.from(new Set(initialMenus.map(m => m.category).filter(Boolean)));
      setCategories(["All", ...cats]);
    }
  }, [initialMenus]);

  /* ── Timer ── */
  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (timer > 0) iv = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  /* ── Auth handlers ── */
  const handleSendOtp = async () => {
    if (!fullName.trim()) return toast.error("Please enter your full name");
    if (phoneNumber.length < 10) return toast.error("Please enter a valid phone number");
    if (!email.includes("@")) return toast.error("Please enter a valid email address");
    setIsLoadingAuth(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setAuthStep("otp"); setTimer(60);
      toast.success(`OTP sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally { setIsLoadingAuth(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Please enter 6-digit OTP");
    setIsLoadingAuth(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      localStorage.setItem(`takeaway_email_${initialRestaurant.id}`, email);
      localStorage.setItem(`takeaway_name_${initialRestaurant.id}`, fullName);
      localStorage.setItem(`takeaway_phone_${initialRestaurant.id}`, phoneNumber);
      setAuthStep("authenticated");
      toast.success("Verification successful!");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP ❌");
    } finally { setIsLoadingAuth(false); }
  };

  useEffect(() => { if (otp.length === 6 && authStep === "otp") handleVerifyOtp(); }, [otp]);

  /* ── Cart ops ── */
  const addToCart = (item: Menu) =>
    setCart(p => {
      const ex = p[item.id];
      return ex
        ? { ...p, [item.id]: { ...ex, quantity: ex.quantity + 1 } }
        : { ...p, [item.id]: { id: item.id, name: item.name, price: item.price, quantity: 1 } };
    });

  const removeFromCart = (id: string) =>
    setCart(p => {
      const ex = p[id];
      if (!ex) return p;
      if (ex.quantity === 1) { const n = { ...p }; delete n[id]; return n; }
      return { ...p, [id]: { ...ex, quantity: ex.quantity - 1 } };
    });

  /* ── Place order ── */
  const placeOrder = async () => {
    if (isPlacingOrder) return;
    const items = Object.values(cart);
    if (items.length === 0) return toast.error("Your cart is empty");
    setIsPlacingOrder(true);
    try {
      const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const orderId = `ord_${Date.now()}`;
      const payload = {
        id: orderId, type: "takeaway",
        restaurantId: initialRestaurant.id,
        restaurantSlug: initialRestaurant.customSlug || initialRestaurant.id,
        tableNumber: "Takeaway",
        customerName: fullName, customerEmail: email, customerPhone: phoneNumber,
        pickupTime: pickupTime === "Custom" ? (customTime || "ASAP") : pickupTime === "ASAP" ? "ASAP (≈20 min)" : pickupTime,
        otpVerified: true, items, totalAmount,
        status: "pending", paymentMethod: paymentOption,
        paymentStatus: paymentOption === "cod" ? "unpaid" : "pending_verification",
        isActive: true, sessionId: `sess_${Date.now()}`, createdAt: Date.now(),
      };
      const res = await fetch("/api/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");
      setCart({}); setOpenCheckout(false);
      router.push(`/@${initialRestaurant.customSlug || initialRestaurant.id}/orders/${orderId}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally { setIsPlacingOrder(false); }
  };

  /* ── Derived ── */
  const cartCount = Object.values(cart).reduce((s, i) => s + i.quantity, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);
  const filteredMenus = initialMenus.filter(m => {
    const matchCat = activeCategory === "All" || m.category === activeCategory;
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  /* group by category when showing "All" */
  const grouped = filteredMenus.reduce((acc, m) => {
    const cat = m.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Menu[]>);

  const upiLink = initialRestaurant.upiId
    ? `upi://pay?pa=${initialRestaurant.upiId}&pn=${encodeURIComponent(initialRestaurant.name)}&am=${cartTotal}&cu=INR&tn=TakeawayOrder`
    : "";

  /* ══════════════════════════════════════════════════════════════
     SCREEN 1 — AUTH
  ══════════════════════════════════════════════════════════════ */
  if (authStep !== "authenticated") {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Branding */}
          <div className="text-center mb-10">
            {initialRestaurant.logo ? (
              <img src={initialRestaurant.logo} alt={initialRestaurant.name}
                className="w-20 h-20 rounded-2xl mx-auto shadow object-cover mb-4" />
            ) : (
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <UtensilsCrossed className="w-10 h-10" />
              </div>
            )}
            <h1 className="text-2xl font-black text-gray-900 mb-1">
              Order from<br /><span className="text-emerald-600">{initialRestaurant.name}</span>
            </h1>
            <p className="text-sm text-gray-400 font-medium">Verify your email to place a takeaway order</p>
          </div>

          <AnimatePresence mode="wait">
            {authStep === "details" ? (
              <motion.div key="details" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="space-y-4 mb-6">
                  {[
                    { label: "Full Name", value: fullName, onChange: setFullName, type: "text", placeholder: "John Doe" },
                    { label: "Phone Number", value: phoneNumber, onChange: setPhoneNumber, type: "tel", placeholder: "9876543210", maxLength: 10 },
                    { label: "Email Address", value: email, onChange: setEmail, type: "email", placeholder: "john@example.com" },
                  ].map(f => (
                    <div key={f.label}>
                      <Label className="text-sm font-semibold text-gray-700 block mb-1.5">{f.label}</Label>
                      <Input
                        type={f.type} placeholder={f.placeholder} value={f.value}
                        onChange={e => f.onChange(e.target.value)}
                        maxLength={(f as any).maxLength}
                        className="h-12 bg-gray-50 border-gray-200 rounded-xl text-[15px] font-medium focus-visible:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full h-13 text-[15px] font-bold bg-[#0f9d6a] hover:bg-[#0c7f56] text-white rounded-xl shadow-[0_4px_14px_rgba(15,157,106,0.3)] h-12"
                  onClick={handleSendOtp} disabled={isLoadingAuth}
                >
                  {isLoadingAuth ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get OTP on Email →"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <p className="text-sm font-semibold text-gray-500 text-center mb-5">
                  Enter the 6-digit OTP sent to <span className="text-gray-900">{email}</span>
                </p>
                <div className="flex justify-center mb-6">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  className="w-full h-12 text-[15px] font-bold bg-[#0f9d6a] hover:bg-[#0c7f56] text-white rounded-xl"
                  onClick={handleVerifyOtp} disabled={isLoadingAuth}
                >
                  {isLoadingAuth ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                </Button>
                <div className="flex items-center justify-between mt-4">
                  <button className="text-sm text-gray-500 underline" onClick={() => { setAuthStep("details"); setOtp(""); }}>
                    Change email
                  </button>
                  <button
                    className={`text-sm font-semibold ${timer > 0 ? "text-gray-400" : "text-emerald-600"}`}
                    onClick={() => { if (timer === 0) { setOtp(""); handleSendOtp(); } }}
                    disabled={isLoadingAuth || timer > 0}
                  >
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     SCREEN 2 — MENU BROWSER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-white font-sans" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* ── STICKY HEADER ─────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        {/* Row 1: logo + name + cart */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {initialRestaurant.logo ? (
            <img src={initialRestaurant.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-black text-gray-900 truncate leading-tight">{initialRestaurant.name}</h1>
            <p className="text-[12px] text-gray-500 font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-orange-400" /> Takeaway · Pickup
            </p>
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setOpenCheckout(true)}
              className="relative flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-xl shadow-md shrink-0 transition-transform active:scale-95"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            </button>
          )}
        </div>

        {/* Row 2: Search */}
        <div className="relative px-4 pb-3">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search dishes, pizza, burger…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-gray-100 rounded-full text-[14px] text-gray-800 placeholder:text-gray-400 outline-none border border-transparent focus:border-emerald-400 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 3: Horizontal category chips */}
        {categories.length > 1 && (
          <div ref={catBarRef} className="flex gap-2 overflow-x-auto px-4 pb-3 hide-scrollbar">
            {categories.map(cat => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-semibold transition-all active:scale-95 whitespace-nowrap border ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                  }`}
                >
                  <span className="text-[15px] leading-none">{catIcon(cat)}</span>
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── SCROLLABLE BODY ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-36">
        {filteredMenus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : "No items available right now"}
            </p>
          </div>
        ) : activeCategory !== "All" ? (
          /* ── Single category list ── */
          <MenuList items={filteredMenus} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
        ) : (
          /* ── Grouped list ── */
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              {/* Category divider */}
              <div className="flex items-center gap-2 px-4 pt-5 pb-2 sticky top-0 bg-white/95 backdrop-blur-sm z-[5]">
                <span className="text-base">{catIcon(cat)}</span>
                <h2 className="text-[15px] font-black text-gray-800">{cat}</h2>
                <span className="text-[12px] text-gray-400 font-medium">({items.length})</span>
              </div>
              <MenuList items={items} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
            </div>
          ))
        )}
      </div>

      {/* ── STICKY CART BAR ─────────────────────────────────────── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-2 z-50 bg-gradient-to-t from-white via-white/90 to-transparent"
            style={{ maxWidth: 480, margin: "0 auto", left: 0, right: 0 }}
          >
            <button
              onClick={() => setOpenCheckout(true)}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center justify-between px-4 shadow-[0_8px_20px_rgba(15,157,106,0.35)] transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 h-9 w-9 rounded-full flex items-center justify-center font-black text-[14px]">
                  {cartCount}
                </div>
                <div className="text-left">
                  <p className="font-bold text-[13px] leading-tight">View Cart</p>
                  <p className="text-white/75 text-[11px] font-medium">{cartCount} item{cartCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-black text-[16px]">₹{cartTotal}</span>
                <ChevronRight className="w-5 h-5 opacity-80" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHECKOUT DIALOG ─────────────────────────────────────── */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl border-0 bg-gray-50 h-[88dvh] sm:h-auto flex flex-col mt-auto">
          <DialogHeader className="px-5 pt-5 pb-4 bg-white border-b border-gray-100 shrink-0">
            <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Confirm Pickup
            </DialogTitle>
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 mt-1 rounded-full border border-emerald-100">
              🛵 Pickup · No Table Required
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Cart summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="space-y-2.5">
                {Object.values(cart).map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-black flex items-center justify-center">{item.quantity}</span>
                      <span className="font-semibold text-gray-800 line-clamp-1">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 ml-3 shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-600 text-sm">Total Amount</span>
                <span className="font-black text-emerald-600 text-[18px]">₹{cartTotal}</span>
              </div>
            </div>

            {/* Pickup time */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 text-[14px]">⏰ Pickup Time</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["ASAP", "30 min", "45 min", "Custom"] as PickupOption[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setPickupTime(t)}
                    className={`h-10 rounded-xl text-[13px] font-semibold border transition-all ${
                      pickupTime === t
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {pickupTime === "Custom" && (
                <div className="mt-3">
                  <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
                    className="rounded-xl h-11 border-gray-200" />
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 text-[14px]">💳 Payment Method</h3>
              <RadioGroup value={paymentOption} onValueChange={v => setPaymentOption(v as PayOpt)} className="space-y-2.5">
                <div className={`p-3.5 rounded-xl border transition-all ${paymentOption === "cod" ? "border-emerald-500 bg-emerald-50/40" : "border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="font-semibold text-gray-900 cursor-pointer flex-1">Pay at Counter 🏪</Label>
                  </div>
                </div>
                {initialRestaurant.upiId && (
                  <div className={`rounded-xl border transition-all overflow-hidden ${paymentOption === "upi" ? "border-emerald-500 bg-emerald-50/20" : "border-gray-200"}`}>
                    <div className="p-3.5 flex items-center gap-3 cursor-pointer" onClick={() => setPaymentOption("upi")}>
                      <RadioGroupItem value="upi" id="upi" />
                      <Label htmlFor="upi" className="font-semibold text-gray-900 cursor-pointer flex-1">Pay via UPI 📲</Label>
                    </div>
                    {paymentOption === "upi" && (
                      <div className="px-4 pb-4">
                        <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-center shadow-sm">
                          <p className="font-bold text-gray-900 mb-3 text-sm">Scan & Pay</p>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`}
                            className="w-36 h-36 mx-auto mb-3 rounded-xl border border-gray-100 p-2 shadow-sm" alt="UPI QR"
                          />
                          <p className="text-xs text-gray-500">UPI ID: <span className="font-bold text-gray-800">{initialRestaurant.upiId}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup>
            </div>
          </div>

          {/* Place order CTA */}
          <div className="shrink-0 px-4 pb-5 pt-3 bg-white border-t border-gray-100">
            <Button
              onClick={placeOrder}
              disabled={isPlacingOrder}
              className="w-full h-13 text-[15px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-[0_4px_14px_rgba(15,157,106,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 h-12 flex items-center justify-center gap-2"
            >
              {isPlacingOrder
                ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Placing Order...</span></>
                : <><CheckCircle className="w-5 h-5" /><span>{paymentOption === "upi" ? "I Paid · Place Order" : "🍽️ Place Order"}</span></>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (min-width: 481px) {
          .menu-frame { box-shadow: 0 0 0 1px #e5e7eb, 0 8px 40px rgba(0,0,0,0.10); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MENU LIST — Zomato-style row cards
═══════════════════════════════════════════════════════════════ */
function MenuList({
  items, cart, onAdd, onRemove,
}: {
  items: Menu[];
  cart: Record<string, CartItem>;
  onAdd: (item: Menu) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-gray-50">
      {items.map(item => {
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
            className="flex gap-4 px-4 py-4 bg-white active:bg-gray-50 transition-colors"
          >
            {/* LEFT: text details */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {/* Dietary indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.dietaryTags?.includes("veg") && (
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] border-2 border-green-600 rounded-[3px] shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                  </span>
                )}
                {item.dietaryTags?.includes("non-veg") && (
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] border-2 border-red-600 rounded-[3px] shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                  </span>
                )}
                {(isBestseller || isPopular) && (
                  <span className="flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    {isBestseller ? "Bestseller" : "Popular"}
                  </span>
                )}
                {item.highlight === "chef special" && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    👨‍🍳 Chef's Special
                  </span>
                )}
              </div>

              <h3 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
                {item.name}
              </h3>

              {item.description && (
                <p className="text-[12.5px] text-gray-400 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              )}

              <p className="text-[15px] font-bold text-gray-900 mt-0.5">₹{item.price}</p>
            </div>

            {/* RIGHT: image + add button */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-[90px] h-[80px] rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Add / Stepper */}
              <AnimatePresence mode="wait">
                {qty === 0 ? (
                  <motion.button
                    key="add"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    onClick={() => onAdd(item)}
                    className="w-[90px] h-8 rounded-lg bg-white text-emerald-600 border-2 border-emerald-500 text-[13px] font-bold shadow-sm hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
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
                    className="flex items-center justify-between w-[90px] h-8 rounded-lg bg-emerald-600 px-1"
                  >
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-md transition-colors active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black text-[14px] text-white w-5 text-center select-none">{qty}</span>
                    <button
                      onClick={() => onAdd(item)}
                      className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-md transition-colors active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
