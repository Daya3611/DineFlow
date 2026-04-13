"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { Menu, Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, UtensilsCrossed, Phone, Lock, ChevronRight, 
  ShoppingBag, CheckCircle, Loader2, Search, Minus, Plus 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_ICONS: Record<string, string> = {
  All: "🍽️", Starters: "🥗", Mains: "🍛", Breads: "🫓", Rice: "🍚", 
  Desserts: "🍮", Beverages: "🥤", Snacks: "🍟", Breakfast: "🥞"
};

export default function ClientTakeaway({
  initialRestaurant,
  initialMenus,
}: {
  initialRestaurant: Restaurant;
  initialMenus: Menu[];
}) {
  const router = useRouter();
  
  // Auth state
  const [authStep, setAuthStep] = useState<"details" | "otp" | "authenticated">("details");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [timer, setTimer] = useState(0);

  // Menu / Cart state
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, { id: string; name: string; price: number; quantity: number }>>({});
  
  const [openCheckout, setOpenCheckout] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"cod" | "upi">("cod");
  const [pickupTime, setPickupTime] = useState<"ASAP" | "30 min" | "45 min" | "Custom">("ASAP");
  const [customTime, setCustomTime] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  useEffect(() => {
    // Check if previously logged in for this restaurant
    const storedEmail = localStorage.getItem(`takeaway_email_${initialRestaurant.id}`);
    const storedName = localStorage.getItem(`takeaway_name_${initialRestaurant.id}`);
    const storedPhone = localStorage.getItem(`takeaway_phone_${initialRestaurant.id}`);
    if (storedEmail && storedName && storedPhone) {
      setEmail(storedEmail);
      setFullName(storedName);
      setPhoneNumber(storedPhone);
      setAuthStep("authenticated");
    }
  }, [initialRestaurant.id]);

  useEffect(() => {
    if (menus.length > 0) {
      const cats = Array.from(new Set(menus.map(m => m.category).filter(Boolean)));
      setCategories(["All", ...cats]);
    }
  }, [menus]);

  // Auth flow setup (recaptcha removed)
  useEffect(() => {
    if (typeof window === "undefined") return;
  }, []);

  // resend timer
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    if (!fullName.trim()) return toast.error("Please enter your full name");
    if (phoneNumber.length < 10) return toast.error("Please enter a valid phone number");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email address");
    setIsLoadingAuth(true);
    
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      
      setAuthStep("otp");
      setTimer(60);
      toast.success(`OTP sent to ${email}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Please enter 6-digit OTP");
    setIsLoadingAuth(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error(err);
      toast.error(err.message || "Invalid OTP ❌");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Auto verify when OTP complete
  useEffect(() => {
    if (otp.length === 6 && authStep === "otp") {
      handleVerifyOtp();
    }
  }, [otp, authStep]);

  // Cart operations
  const handleAddToCart = (item: Menu) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 }};
      return { ...prev, [item.id]: { id: item.id, name: item.name, price: item.price, quantity: 1 }};
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

  const placeOrder = async () => {
    if (isPlacingOrder) return;
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) return toast.error("Your cart is empty");
    
    setIsPlacingOrder(true);
    try {
      const newAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const orderId = `ord_${Date.now()}`;
      
      const newOrderPayload = {
        id: orderId,
        type: "takeaway",
        restaurantId: initialRestaurant.id,
        restaurantSlug: initialRestaurant.customSlug || initialRestaurant.id,
        tableNumber: "Takeaway",
        customerName: fullName,
        customerEmail: email,
        customerPhone: phoneNumber,
        pickupTime: pickupTime === "Custom" ? (customTime || "ASAP") : (pickupTime === "ASAP" ? "ASAP (approx +20m)" : pickupTime),
        otpVerified: true,
        items: cartItems,
        totalAmount: newAmount,
        status: "pending",
        paymentMethod: paymentOption,
        paymentStatus: paymentOption === 'cod' ? "unpaid" : "pending_verification",
        isActive: true,
        sessionId: `sess_${Date.now()}`,
        createdAt: Date.now(),
      };

      // Create directly or via robust API. Using setDoc directly (based on standard Firestore usage for clients without API constraints, but prefer API for safety. In Dineflow they use /api/order for Dine-in).
      // Let's use the API to ensure table logic doesn't break, wait, takeaway has no table.
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderPayload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error("ORDER ERROR:", data);
        throw new Error(data.error || "Failed to place order");
      }

      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", fullName);
      localStorage.setItem("userPhone", phoneNumber);
      
      // Clean up
      setCart({});
      setOpenCheckout(false);
      
      // Redirect to specific tracking screen
      router.push(`/@${initialRestaurant.customSlug || initialRestaurant.id}/orders/${orderId}`);
      
    } catch (err: any) {
      toast.error(err.message || "Something went wrong placing the order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  /* ───────────────────────────────────────────────────────── */
  /* SCREEN 1: AUTHENTICATION FLOW                             */
  /* ───────────────────────────────────────────────────────── */
  if (authStep !== "authenticated") {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            {initialRestaurant.logo ? (
              <img src={initialRestaurant.logo} alt={initialRestaurant.name} className="w-20 h-20 rounded-2xl mx-auto shadow-sm object-cover mb-4" />
            ) : (
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <UtensilsCrossed className="w-10 h-10" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">Ordering from<br/>{initialRestaurant.name}</h1>
            <p className="text-sm text-gray-500 font-medium">Please verify your number to proceed</p>
          </div>

          <AnimatePresence mode="wait">
            {authStep === "details" ? (
              <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-4">
                  <Label className="text-sm font-semibold text-gray-700 block mb-2 px-1">Full Name</Label>
                  <Input 
                    type="text" 
                    placeholder="John Doe" 
                    className="h-14 bg-gray-50 border-gray-200 rounded-xl font-semibold text-lg"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <Label className="text-sm font-semibold text-gray-700 block mb-2 px-1">Phone Number</Label>
                  <Input 
                    type="tel" 
                    placeholder="9876543210" 
                    className="h-14 bg-gray-50 border-gray-200 rounded-xl font-semibold text-lg"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={10}
                  />
                </div>
                <div className="mb-6">
                  <Label className="text-sm font-semibold text-gray-700 block mb-2 px-1">Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="h-14 bg-gray-50 border-gray-200 rounded-xl font-semibold text-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button className="w-full h-14 text-[16px] bg-[#0f9d6a] [#0c7f56] ga" onClick={handleSendOtp} disabled={isLoadingAuth}>
                  {isLoadingAuth ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get OTP on Email"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Label className="text-sm font-semibold text-gray-700 block mb-4 px-1 text-center">Enter 6-digit OTP</Label>
                
                <div className="flex justify-center mb-6">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <p className="text-xs text-gray-500 text-center mb-6 font-medium">Sent to <span className="font-bold text-gray-700">{email}</span> • <Button className="text-emerald-600 ml-1" onClick={() => { setAuthStep("details"); setOtp(""); }}>Edit</Button></p>
                <Button className="w-full h-14 text-[16px] bg-[#0f9d6a] [#0c7f56] ga" onClick={handleVerifyOtp} disabled={isLoadingAuth}>
                  {isLoadingAuth ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                </Button>
                <div className="text-center mt-4">
                  <Button variant="ghost" className="text-emerald-600 text-sm hover: h-9" onClick={() => {if (timer === 0) {setOtp(""); handleSendOtp();}}} disabled={isLoadingAuth || timer > 0}>
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────── */
  /* SCREEN 2: TAKEAWAY MENU BROWSER                           */
  /* ───────────────────────────────────────────────────────── */
  const cartItemsCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((acc, item) => acc + item.price * item.quantity, 0);
  const filteredMenus = menus.filter(m => {
    const matchesCat = selectedCategory === "All" || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const upiLink = initialRestaurant.upiId
    ? `upi://pay?pa=${initialRestaurant.upiId}&pn=${encodeURIComponent(initialRestaurant.name)}&am=${cartTotal}&cu=INR&tn=TakeawayOrder`
    : "";

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#f8fafc] font-sans pb-[80px]">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {initialRestaurant.logo ? (
            <img src={initialRestaurant.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover bg-gray-50" />
          ) : (
             <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
               <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
             </div>
          )}
          <div className="flex-1 overflow-hidden">
            <h1 className="text-xl font-extrabold text-gray-900 truncate tracking-tight">{initialRestaurant.name}</h1>
            <p className="text-sm font-semibold text-gray-500 whitespace-nowrap truncate flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 text-orange-500" /> Takeaway • Pickup Order</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search menu..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl text-[15px] font-medium" 
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="flex w-full">
          {/* Categories Sidebar */}
          <div className="w-[85px] shrink-0 border-r border-gray-100 bg-[#f8fafc] flex flex-col h-full sticky left-0 top-0 overflow-y-auto scrollbar-none py-2 pb-24">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <Button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`flex flex-col items-center justify-center p-3 gap-1.5 transition-all text-center
                    ${active ? "bg-white border-y border-l-4 border-l-[#0f9d6a] border-y-gray-100 shadow-[0_4px_10px_rgba(0,0,0,0.02)] relative -mr-[1px] z-10" : "bg-transparent text-gray-500 hover:bg-gray-100"}`}
                >
                  <div className={`text-[20px] mb-0.5 ${active ? "opacity-100 scale-110" : "opacity-70 grayscale"}`}>{CATEGORY_ICONS[cat] || "🍽️"}</div>
                  <span className={`text-[10px] uppercase tracking-wider ${active ? "font-extrabold text-gray-900" : "font-semibold"}`}>{cat.length > 10 ? cat.slice(0, 10) + '..' : cat}</span>
                </Button>
              );
            })}
          </div>

          {/* Menu Items List */}
          <div className="flex-1 bg-white px-4 py-4 pb-[100px] min-h-[calc(100vh-140px)]">
            <h2 className="text-[18px] font-extrabold text-gray-900 mb-4">{selectedCategory}</h2>
            {filteredMenus.length === 0 ? (
               <div className="text-center py-10">
                 <p className="text-gray-400 font-medium">No items found</p>
               </div>
            ) : (
               <div className="space-y-4">
                 {filteredMenus.map((item) => {
                   const qty = cart[item.id]?.quantity || 0;
                   return (
                     <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        {item.image ? (
                          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})`}} />
                        ) : (
                          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100"><UtensilsCrossed className="w-5 h-5 text-gray-300"/></div>
                        )}
                        <div className="flex-1 min-w-0 pr-2">
                           <h3 className="font-semibold text-gray-900 leading-tight mb-1">{item.name}</h3>
                           <p className="font-bold text-gray-900 text-sm">₹{item.price}</p>
                        </div>
                        <div className="shrink-0 flex items-center justify-end">
                           {qty === 0 ? (
                             <Button onClick={() => handleAddToCart(item)} size="sm" variant="outline" className="h-8 rounded-lg shadow-sm font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 w-[72px]">ADD</Button>
                           ) : (
                             <div className="flex items-center bg-emerald-600 rounded-lg h-8 shadow-md">
                                <Button onClick={() => handleRemoveFromCart(item.id)} className="w-8 h-full flex items-center justify-center text-white active:bg-emerald-700 rounded-l-lg"><Minus className="w-3.5 h-3.5"/></Button>
                                <span className="w-6 text-center text-sm font-bold text-white leading-none">{qty}</span>
                                <Button onClick={() => handleAddToCart(item)} className="w-8 h-full flex items-center justify-center text-white active:bg-emerald-700 rounded-r-lg"><Plus className="w-3.5 h-3.5"/></Button>
                             </div>
                           )}
                        </div>
                     </div>
                   )
                 })}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING CART BAR */}
      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-0 left-0 right-0 p-4 pt-0 z-50 bg-gradient-to-t from-white via-white to-transparent pb-6">
            <Button onClick={() => setOpenCheckout(true)} className="w-full h-14 rounded-2xl bg-[#0f9d6a] active:scale-[0.98] text-white flex items-center justify-between px-4 shadow-[0_8px_20px_rgba(15,157,106,0.3)] transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 h-9 w-9 rounded-full flex items-center justify-center font-bold text-[14px]">
                  {cartItemsCount}
                </div>
                <div className="text-left leading-tight">
                  <p className="font-bold text-sm">View Cart</p>
                  <p className="text-white/80 text-[11px] font-semibold mt-[2px]">{cartItemsCount} item(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[16px]">₹{cartTotal}</span>
                <ChevronRight className="h-5 w-5 opacity-80" />
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl border-0 bg-gray-50 h-[85vh] sm:h-auto flex flex-col mt-auto pb-4">
          <DialogHeader className="px-5 pt-6 pb-4 bg-white border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Confirm Pickup
            </DialogTitle>
            <p className="text-sm font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 mt-2 rounded">Pickup Order (No Table)</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
               {Object.values(cart).map((item) => (
                 <div key={item.id} className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                    <div className="flex gap-2">
                       <span className="font-bold text-gray-500 text-xs mt-0.5">{item.quantity}x</span>
                       <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">₹{item.price * item.quantity}</span>
                 </div>
               ))}
               <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <span className="font-bold text-gray-500">Total</span>
                  <span className="font-extrabold text-emerald-600 text-lg">₹{cartTotal}</span>
               </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-[15px]">Pickup Time</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {["ASAP", "30 min", "45 min", "Custom"].map(time => (
                  <Button key={time} variant={pickupTime === time ? "default" : "outline"} className={`rounded-xl ${pickupTime === time ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} onClick={() => setPickupTime(time as any)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
              {pickupTime === "Custom" && (
                <div className="mt-3">
                  <Input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="rounded-xl h-12" />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-[15px] flex items-center justify-between">How would you like to pay?</h3>
              <RadioGroup value={paymentOption} onValueChange={(val: "cod" | "upi") => setPaymentOption(val)} className="space-y-3">
                <div className={`p-4 rounded-xl border transition-all ${paymentOption === "cod" ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200"}`}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="cod" id="cod" className="text-emerald-600 border-gray-300 data-[state=checked]:border-emerald-600" />
                    <Label htmlFor="cod" className="font-semibold text-gray-900 flex-1 cursor-pointer">Pay at Counter</Label>
                  </div>
                </div>

                {initialRestaurant.upiId && (
                  <div className={`rounded-xl border transition-all overflow-hidden ${paymentOption === "upi" ? "border-emerald-500 bg-emerald-50/20" : "border-gray-200"}`}>
                    <div className="p-4 flex items-center space-x-3 cursor-pointer" onClick={() => setPaymentOption("upi")}>
                      <RadioGroupItem value="upi" id="upi" className="text-emerald-600 border-gray-300 data-[state=checked]:border-emerald-600" />
                      <Label htmlFor="upi" className="font-semibold text-gray-900 flex-1 cursor-pointer">Pay via UPI</Label>
                    </div>
                    
                    {paymentOption === "upi" && (
                      <div className="p-4 pt-0">
                        <div className="mt-2 p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                          <div className="text-center mb-4 font-bold text-gray-900">Scan & Pay</div>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`} className="w-36 h-36 mx-auto mb-3 rounded-xl border border-gray-100 p-2 shadow-sm" alt="UPI QR" />
                          <p className="text-sm text-center text-gray-500 font-medium mb-1">UPI ID: <span className="text-gray-900">{initialRestaurant.upiId}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-100 shadow-[0_-8px_20px_rgba(0,0,0,0.03)] z-50">
             <Button className="w-full h-14 hover: text-[16px]" onClick={placeOrder} disabled={isPlacingOrder}>
               {isPlacingOrder ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />} 
               {paymentOption === 'upi' ? "I Have Paid & Place Order" : "Place Order"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
