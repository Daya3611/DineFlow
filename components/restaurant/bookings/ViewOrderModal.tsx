"use client";

import React from "react";
import { Dialog as BaseDialog, DialogContent as Content, DialogHeader as Header, DialogTitle as Title, DialogFooter as Footer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, CheckCircle2, Clock, DollarSign, UserCheck, ChevronRight } from "lucide-react";

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  tableName: string;
}

export function ViewOrderModal({
  isOpen,
  onClose,
  guestName,
  tableName,
}: ViewOrderModalProps) {
  const orderItems = [
    { name: "Butter Chicken (Special)", qty: 1, price: 420 },
    { name: "Garlic Naan", qty: 3, price: 180 },
    { name: "Paneer Tikka Masala", qty: 1, price: 340 },
    { name: "Jeera Rice", qty: 1, price: 160 },
    { name: "Gulab Jamun (2 pcs)", qty: 2, price: 140 },
  ];

  const subtotal = orderItems.reduce((acc, i) => acc + i.price, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  return (
    <BaseDialog open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[480px] p-0 rounded-2xl border-slate-200">
        <Header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-emerald-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#008A45] text-white flex items-center justify-center font-bold shadow-xs">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <Title className="text-base font-extrabold text-slate-900">Live Table Order</Title>
                <p className="text-xs text-slate-500">{tableName} · <span className="font-semibold text-slate-800">{guestName}</span></p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
              Kitchen Preparing
            </span>
          </div>
        </Header>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Assigned Waiter:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-[#008A45]" /> Ramesh (Station A)
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items (Round #1)</h4>
            <div className="space-y-1.5 border border-slate-100 rounded-xl p-3 bg-white">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#008A45] bg-emerald-50 h-5 w-5 rounded-md flex items-center justify-center text-[11px]">
                      {item.qty}x
                    </span>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">₹{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border border-slate-200/80 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Taxes & GST (5%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total Bill</span>
              <span className="text-[#008A45]">₹{total}</span>
            </div>
          </div>

          <Footer className="pt-2 flex justify-end">
            <Button type="button" onClick={onClose} className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-5">
              Close Order
            </Button>
          </Footer>
        </div>
      </Content>
    </BaseDialog>
  );
}
