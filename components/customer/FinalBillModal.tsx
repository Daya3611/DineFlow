"use client";

import React from "react";
import { Order as OrderType, OrderItem } from "@/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, ShieldCheck, Receipt } from "lucide-react";
import { toast } from "sonner";

interface FinalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderType[];
  tableNumber: string;
  restaurantName?: string;
  onPayNow: () => void;
  onRequestWaiter: () => void;
}

export function FinalBillModal({
  isOpen,
  onClose,
  orders,
  tableNumber,
  restaurantName = "DineFlow",
  onPayNow,
  onRequestWaiter,
}: FinalBillModalProps) {
  // Calculate merged item quantities across all rounds
  const itemMap: { [key: string]: OrderItem } = {};
  let rawSubtotal = 0;

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      rawSubtotal += item.price * item.quantity;
      if (itemMap[item.name]) {
        itemMap[item.name].quantity += item.quantity;
      } else {
        itemMap[item.name] = { ...item };
      }
    });
  });

  const mergedItems = Object.values(itemMap);

  // Taxes & Total
  const cgst = Math.round(rawSubtotal * 0.025 * 100) / 100;
  const sgst = Math.round(rawSubtotal * 0.025 * 100) / 100;
  const grandTotal = Math.round(rawSubtotal + cgst + sgst);

  // Duration calculation
  const earliestTs = orders.length > 0 ? Math.min(...orders.map((o) => o.createdAt)) : Date.now();
  const durationMins = Math.max(1, Math.floor((Date.now() - earliestTs) / 60000));
  const durationStr =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
      : `${durationMins}m`;

  const sessionIdShort = orders[0]?.sessionId
    ? `#${orders[0].sessionId.slice(-6).toUpperCase()}`
    : "#SESSION-ACTIVE";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[88vh] sm:h-[85vh] max-w-[430px] mx-auto rounded-t-3xl p-0 overflow-hidden flex flex-col bg-[#F8FAFC] border-t border-slate-200"
      >
        {/* Top Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header matching Screenshot #4 */}
        <div className="px-5 pt-1 pb-4 shrink-0 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {restaurantName}
              </h3>
              <p className="text-[10px] font-extrabold text-[#16A34A] tracking-wider uppercase">
                DINEFLOW EXPERIENCE
              </p>
            </div>
            <span className="text-xs font-bold text-[#16A34A] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Table {tableNumber}
            </span>
          </div>

          {/* Secure Payment Badge matching screenshot #4 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs text-slate-600 font-semibold shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
            <span>Secure payment via DineFlow</span>
          </div>
        </div>

        {/* Scrollable Itemized Order List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              ITEMIZED SESSION BILL
            </span>
            <span className="text-xs text-slate-400 font-mono font-medium">
              {sessionIdShort} • {durationStr}
            </span>
          </div>

          {mergedItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No items ordered in this session yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {mergedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-medium text-slate-700 py-1.5 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-emerald-50 text-[#16A34A] font-bold flex items-center justify-center text-[11px]">
                      {item.quantity}x
                    </span>
                    <span className="font-semibold text-slate-900">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₹{rawSubtotal}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>CGST (2.5%)</span>
              <span>₹{cgst}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>SGST (2.5%)</span>
              <span>₹{sgst}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
              <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
              <span className="text-2xl font-black text-[#16A34A]">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons matching screenshot #4 */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-2">
          <Button
            onClick={onPayNow}
            className="w-full h-12 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm gap-2 shadow-xs cursor-pointer"
          >
            <Receipt className="h-4 w-4" /> Pay Bill - ₹{grandTotal.toLocaleString("en-IN")}
          </Button>

          <Button
            variant="outline"
            onClick={onRequestWaiter}
            className="w-full h-10 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5 cursor-pointer hover:bg-slate-50"
          >
            <Bell className="h-3.5 w-3.5 text-amber-500" /> Request Waiter / Cash Pay
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
