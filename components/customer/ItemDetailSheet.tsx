"use client";

import React, { useState } from "react";
import { Menu as MenuItem } from "@/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Clock, Star, Heart, Minus, Plus, ArrowLeft } from "lucide-react";

interface ItemDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, portion: "half" | "full", quantity: number) => void;
}

export function ItemDetailSheet({
  item,
  isOpen,
  onClose,
  onAddToCart,
}: ItemDetailSheetProps) {
  if (!item) return null;

  const [portion, setPortion] = useState<"half" | "full">("full");
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const hasHalf = Boolean(item.hasHalfPortion && item.halfPrice);
  const activePortion = hasHalf ? portion : "full";

  const price = activePortion === "half" && item.halfPrice ? item.halfPrice : item.price;
  const totalPrice = price * quantity;

  const isVeg = item.dietaryTags?.includes("veg") || !item.dietaryTags?.includes("non-veg");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92vh] sm:h-[88vh] max-w-[430px] mx-auto rounded-t-3xl p-0 overflow-hidden flex flex-col bg-[#F8FAFC] border-t border-slate-200"
      >
        {/* Top Navigation Bar inside sheet matching reference screenshot #2 */}
        <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-700 font-extrabold text-sm hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Item Detail
          </button>
          <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto" />
          <div className="w-6" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image Hero Container matching screenshot #2 */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-100 h-56 w-full shadow-xs">
            <img
              src={
                item.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
              }
              alt={item.name}
              className="w-full h-full object-cover"
            />

            {/* Prep Time Badge Top Left */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-extrabold text-slate-800 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>35 min</span>
            </div>

            {/* Favorite Button Top Right */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-4 right-4 h-9 w-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 shadow-xs hover:scale-105 transition-transform"
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-700"
                  }`}
              />
            </button>
          </div>

          {/* Title & Rating */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 ${isVeg ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"
                    }`}
                />
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {item.name}
              </h2>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 pt-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>4.8</span>
              <span className="text-slate-400 font-normal">(124 reviews)</span>
            </div>
          </div>

          {/* Portion Size Selector matching screenshot #2 */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Portion Size
            </label>
            {hasHalf ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPortion("half")}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${activePortion === "half"
                      ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <p className="text-xs font-bold">Half</p>
                  <p className="text-sm font-extrabold mt-0.5">
                    ₹{item.halfPrice}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPortion("full")}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${activePortion === "full"
                      ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <p className="text-xs font-bold">Full</p>
                  <p className="text-sm font-extrabold mt-0.5">₹{item.price}</p>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-[#16A34A] flex items-center justify-between text-xs font-extrabold">
                <span>Full Portion Plate</span>
                <span>₹{item.price}</span>
              </div>
            )}
          </div>

          {/* Description matching screenshot #2 */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Description
            </label>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {item.description ||
                "Juicy grilled dish marinated in aromatic spices, garlic, and fresh herbs. Slowly flame-grilled to perfection to lock in the flavors, served with a side of dip and seasonal greens."}
            </p>
          </div>
        </div>

        {/* Sticky Bottom Actions Row matching screenshot #2 */}
        <div className="p-5 bg-white border-t border-slate-100 flex items-center gap-4 shrink-0 shadow-lg">
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between bg-slate-100 rounded-full px-3 py-2 border border-slate-200/60 w-28 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-6 w-6 rounded-full bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-extrabold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-6 w-6 rounded-full bg-white text-slate-700 font-bold flex items-center justify-center shadow-xs"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={() => {
              onAddToCart(item, portion, quantity);
              onClose();
            }}
            className="flex-1 h-12 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm shadow-xs cursor-pointer"
          >
            Add to Cart - ₹{totalPrice}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
