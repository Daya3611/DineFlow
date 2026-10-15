"use client";

import React, { useState } from "react";
import { Order as OrderType } from "@/types";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface YourOrdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderType[];
  tableNumber: string;
  onAddMoreItems: () => void;
  onViewBill: () => void;
}

export function YourOrdersSheet({
  isOpen,
  onClose,
  orders,
  tableNumber,
  onAddMoreItems,
  onViewBill,
}: YourOrdersSheetProps) {
  const [showRequestBillBox, setShowRequestBillBox] = useState(false);

  // Sort orders by roundNumber descending
  const sortedOrders = [...orders].sort(
    (a, b) => (b.roundNumber || 0) - (a.roundNumber || 0)
  );

  // Running total of all active rounds
  const allRoundsTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const getRoundStatusBadge = (status: OrderType["status"]) => {
    switch (status) {
      case "pending":
        return { label: "NEW", class: "bg-red-50 text-red-600 border-red-200" };
      case "preparing":
        return { label: "PREPARING", class: "bg-amber-50 text-amber-700 border-amber-200" };
      case "served":
        return { label: "SERVED", class: "bg-emerald-50 text-[#16A34A] border-emerald-200" };
      case "completed":
      case "paid":
        return { label: "COMPLETED", class: "bg-emerald-50 text-[#16A34A] border-emerald-200" };
      default:
        return { label: status.toUpperCase(), class: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const formatTimeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)} hr ago`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[88vh] sm:h-[85vh] max-w-[430px] mx-auto rounded-t-3xl p-0 overflow-hidden flex flex-col bg-[#F8FAFC] border-t border-slate-200"
      >
        {/* Top Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Sheet Header matching reference screenshot #3 */}
        <div className="px-5 pt-1 pb-3 shrink-0 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Your Orders
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sit tight while our chefs are preparing your order.
              </p>
            </div>
            <span className="text-xs font-bold text-[#16A34A] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Table {tableNumber}
            </span>
          </div>

          {/* ALL ROUNDS TOTAL Banner matching screenshot #3 */}
          <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ALL ROUNDS TOTAL
              </p>
              <p className="text-2xl font-extrabold text-[#16A34A] tracking-tight">
                ₹{allRoundsTotal.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-[#16A34A] shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Scrollable Order Rounds List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50">
          {sortedOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">
              No orders placed in this session yet.
            </div>
          ) : (
            sortedOrders.map((order, idx) => {
              const roundNum = order.roundNumber || sortedOrders.length - idx;
              const statusCfg = getRoundStatusBadge(order.status);
              const roundTotal = (order.items || []).reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3"
                >
                  {/* Round Header matching screenshot #3 */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-slate-100 font-extrabold text-xs text-slate-800 flex items-center justify-center">
                        R{roundNum}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.class}`}
                      >
                        ● {statusCfg.label}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {formatTimeAgo(order.createdAt)}
                    </span>
                  </div>

                  {/* Items List matching screenshot #3 */}
                  <div className="space-y-2">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs font-medium text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-md bg-emerald-50 text-[#16A34A] border border-emerald-100 font-bold flex items-center justify-center text-[11px]">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Round Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                      #ORD-{order.id.slice(-6).toUpperCase()}
                    </span>
                    <div className="text-right">
                      <span className="text-slate-400 font-medium mr-1.5">Round Total</span>
                      <span className="font-extrabold text-slate-900">₹{roundTotal}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Request Bill Box matching screenshot #3 */}
          {showRequestBillBox && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <h4 className="text-sm font-extrabold text-slate-900">
                Request Bill?
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                We'll notify the server to bring your final bill for Table {tableNumber}.
              </p>

              <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  TOTAL AMOUNT
                </span>
                <span className="text-lg font-black text-[#16A34A]">
                  ₹{allRoundsTotal.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => {
                    onViewBill();
                    setShowRequestBillBox(false);
                  }}
                  className="w-full h-11 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs shadow-xs"
                >
                  Confirm & Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestBillBox(false)}
                  className="w-full h-9 rounded-xl border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Row matching reference screenshot #3 */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-2">
          <Button
            onClick={() => {
              onClose();
              onAddMoreItems();
            }}
            className="w-full h-12 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add More Items
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (showRequestBillBox) {
                onViewBill();
              } else {
                setShowRequestBillBox(true);
              }
            }}
            className="w-full h-10 rounded-2xl border-slate-200 hover:border-[#16A34A] text-slate-700 font-bold text-xs gap-1.5 cursor-pointer"
          >
            View Running Bill <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
