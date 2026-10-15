"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Restaurant, Menu } from "@/types";
import { CustomerHeaderNav } from "@/components/customer/CustomerHeaderNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingBag,
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
  Utensils,
  Plus,
  Minus,
  Truck,
  Building,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

interface OrderFoodClientProps {
  restaurant: Restaurant;
  menuItems: Menu[];
  slug: string;
}

type OrderMode = "pickup" | "delivery";

export function OrderFoodClient({
  restaurant,
  menuItems: initialMenuItems,
  slug,
}: OrderFoodClientProps) {
  const [orderMode, setOrderMode] = useState<OrderMode>("pickup");
  const [menuItems, setMenuItems] = useState<Menu[]>(initialMenuItems);

  // Cart
  const [cart, setCart] = useState<{ [id: string]: { item: Menu; quantity: number } }>({});

  // Pickup Details
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Delivery Details
  const [addressFlat, setAddressFlat] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [addressPincode, setAddressPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");

  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    id: string;
    orderCode: string;
    mode: OrderMode;
    total: number;
  } | null>(null);

  // Delivery Validation Logic
  const deliveryEnabled = (restaurant as any).deliveryEnabled !== false;
  const deliveryRadiusKm = (restaurant as any).deliveryRadius || 5;
  const deliveryFee = (restaurant as any).deliveryFee || 40;
  const minOrderValue = (restaurant as any).minimumOrderValue || 200;

  // Real-time menu updates
  useEffect(() => {
    if (!restaurant?.id) return;
    const q = query(collection(db, "menus"), where("restaurantId", "==", restaurant.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      const live = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Menu[];
      setMenuItems(live);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  const addToCart = (item: Menu) => {
    if (item.isAvailable === false) {
      toast.error("This item is currently unavailable");
      return;
    }
    setCart((prev) => {
      const existing = prev[item.id];
      const count = existing ? existing.quantity + 1 : 1;
      return { ...prev, [item.id]: { item, quantity: count } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  // Subtotal Calculation
  const subtotal = useMemo(() => {
    return Object.values(cart).reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  }, [cart]);

  const packagingFee = subtotal > 0 ? 25 : 0;
  const taxes = Math.round(subtotal * 0.05);
  const finalDeliveryFee = orderMode === "delivery" ? deliveryFee : 0;
  const grandTotal = subtotal + packagingFee + taxes + finalDeliveryFee;

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    if (orderMode === "delivery") {
      if (!deliveryEnabled) {
        toast.error("Delivery is currently disabled for this restaurant.");
        return;
      }
      if (subtotal < minOrderValue) {
        toast.error(`Minimum order value for delivery is ₹${minOrderValue}`);
        return;
      }
      if (!addressFlat.trim() || !addressPincode.trim()) {
        toast.error("Please enter a complete delivery address and pincode.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderItems = Object.values(cart).map((c) => ({
        menuId: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
      }));

      const payload = {
        type: "takeaway",
        orderType: orderMode,
        restaurantId: restaurant.id,
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        items: orderItems,
        totalAmount: grandTotal,
        subtotal,
        taxes,
        packagingFee,
        deliveryFee: finalDeliveryFee,
        grandTotal,
        paymentMethod,
        status: "pending",
        deliveryAddress:
          orderMode === "delivery"
            ? `${addressFlat}, ${addressStreet}, ${addressArea} - ${addressPincode}`
            : undefined,
        pickupTime: orderMode === "pickup" ? pickupTime : "ASAP",
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      const orderId = data.orderId || data.id || `ORD_${Date.now()}`;

      const codeSuffix = orderId.slice(-6).toUpperCase();
      setConfirmedOrder({
        id: orderId,
        orderCode: `DF-${codeSuffix}`,
        mode: orderMode,
        total: grandTotal,
      });

      setCart({});
      toast.success("Order placed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 select-none">
      <CustomerHeaderNav restaurant={restaurant} slug={slug} activeTab="order" />

      <main className="max-w-[1000px] mx-auto px-4 pt-6 space-y-6">
        {/* Segmented Control Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Order Food Online
          </h1>

          {/* Mode Switcher */}
          <div className="max-w-md mx-auto p-1.5 rounded-2xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setOrderMode("pickup")}
              className={`py-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                orderMode === "pickup"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building className="h-4 w-4" />
              Pickup
            </button>
            <button
              onClick={() => setOrderMode("delivery")}
              className={`py-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                orderMode === "delivery"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Truck className="h-4 w-4" />
              Home Delivery
            </button>
          </div>

          {orderMode === "pickup" ? (
            <p className="text-xs text-slate-500 font-medium">
              Pick up directly from {restaurant.name} • Ready in approx. 25-35 min
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              Delivered fresh to your doorstep • Delivery fee ₹{deliveryFee}
            </p>
          )}
        </div>

        {/* Delivery Zone Notice */}
        {orderMode === "delivery" && !deliveryEnabled && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center gap-3 text-xs font-bold text-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            Home delivery is currently disabled for this restaurant. Please switch to Pickup.
          </div>
        )}

        {/* Main Grid: Menu vs Cart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Menu Items Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                Select Items
              </h2>

              <div className="space-y-3">
                {menuItems.map((item) => {
                  const qty = cart[item.id]?.quantity || 0;
                  const isAvailable = item.isAvailable !== false;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{item.description}</p>
                        <p className="text-sm font-black text-slate-900 mt-1">₹{item.price}</p>
                        {!isAvailable && (
                          <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 mt-1 inline-block">
                            Currently unavailable
                          </span>
                        )}
                      </div>

                      <div className="shrink-0">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-emerald-600 text-white px-2 py-1 rounded-xl shadow-xs">
                            <button onClick={() => removeFromCart(item.id)} className="h-7 w-7 flex items-center justify-center font-bold">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-black px-1">{qty}</span>
                            <button onClick={() => addToCart(item)} className="h-7 w-7 flex items-center justify-center font-bold">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!isAvailable}
                            onClick={() => addToCart(item)}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
                              isAvailable
                                ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cart & Checkout Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              {Object.keys(cart).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  Your cart is empty. Add dishes to proceed.
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-xs">
                    {Object.values(cart).map(({ item, quantity }) => (
                      <div key={item.id} className="flex items-center justify-between font-medium">
                        <span>{quantity} × {item.name}</span>
                        <span className="font-bold">₹{item.price * quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Item Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Packaging Fee</span>
                      <span>₹{packagingFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & Charges</span>
                      <span>₹{taxes}</span>
                    </div>
                    {orderMode === "delivery" && (
                      <div className="flex justify-between text-emerald-700 font-extrabold">
                        <span>Delivery Fee</span>
                        <span>₹{finalDeliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                      <span>Grand Total</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>

                  {/* Customer Info Form */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1">Full Name *</label>
                      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul Sharma" className="h-10 text-xs rounded-xl" />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1">Phone Number *</label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" className="h-10 text-xs rounded-xl" />
                    </div>

                    {orderMode === "delivery" && (
                      <>
                        <div>
                          <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1">Flat / House No. *</label>
                          <Input value={addressFlat} onChange={(e) => setAddressFlat(e.target.value)} placeholder="Flat 402, Building A" className="h-10 text-xs rounded-xl" />
                        </div>
                        <div>
                          <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1">Pincode *</label>
                          <Input value={addressPincode} onChange={(e) => setAddressPincode(e.target.value)} placeholder="400601" className="h-10 text-xs rounded-xl" />
                        </div>
                      </>
                    )}

                    <Button
                      onClick={handlePlaceOrder}
                      disabled={submitting || subtotal === 0 || !customerName.trim() || !phone.trim()}
                      className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Place ${orderMode === "pickup" ? "Pickup" : "Delivery"} Order (₹${grandTotal}) →`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={Boolean(confirmedOrder)} onOpenChange={() => setConfirmedOrder(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Order Confirmed!</h2>
          <p className="text-xs text-slate-500 mt-1">Order ID: <strong className="text-slate-900 font-mono">{confirmedOrder?.orderCode}</strong></p>
          <Button onClick={() => setConfirmedOrder(null)} className="w-full h-12 rounded-xl bg-emerald-600 text-white font-extrabold mt-6">
            View Order Status
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
