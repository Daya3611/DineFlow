"use client";

import React, { useState } from "react";
import { Dialog as BaseDialog, DialogContent as Content, DialogHeader as Header, DialogTitle as Title, DialogFooter as Footer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, PhoneCall, CheckCircle2, Clock } from "lucide-react";

interface NotifyGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  phone: string;
  tableName?: string;
  onNotifySent: (channel: string) => void;
}

export function NotifyGuestModal({
  isOpen,
  onClose,
  guestName,
  phone,
  tableName = "Table T-2",
  onNotifySent,
}: NotifyGuestModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<"sms" | "whatsapp" | "call">("sms");

  const handleSend = () => {
    onNotifySent(selectedChannel);
    onClose();
  };

  return (
    <BaseDialog open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[440px] p-0 rounded-2xl border-slate-200">
        <Header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-blue-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <Title className="text-lg font-bold text-slate-900">Notify Waitlist Guest</Title>
              <p className="text-xs text-slate-500">Send an instant table alert to <span className="font-bold text-slate-800">{guestName}</span>.</p>
            </div>
          </div>
        </Header>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between">
            <div>
              <span className="font-bold">Assigned Table:</span> {tableName}
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Ready Now</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Notification Channel</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedChannel("sms")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  selectedChannel === "sms"
                    ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Send className="h-4 w-4" /> SMS Alert
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel("whatsapp")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  selectedChannel === "whatsapp"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel("call")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  selectedChannel === "call"
                    ? "bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <PhoneCall className="h-4 w-4" /> Voice Call
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800">Message Preview:</span>
            <p className="italic text-slate-500 text-[11px]">
              &quot;Hello {guestName}, your table ({tableName}) at Manikrai Dhaba is ready! Please report to host stand within 5 mins.&quot;
            </p>
          </div>

          <Footer className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 border-slate-200">
              Cancel
            </Button>
            <Button type="button" onClick={handleSend} className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-5 shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Send Notification
            </Button>
          </Footer>
        </div>
      </Content>
    </BaseDialog>
  );
}
