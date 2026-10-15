"use client";

import React, { useState } from "react";
import { Dialog as BaseDialog, DialogContent as Content, DialogHeader as Header, DialogTitle as Title, DialogFooter as Footer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, MapPin, UserPlus, Phone, User, CheckCircle2 } from "lucide-react";
import { Waitlist } from "@/types";

interface AddToWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<Waitlist>) => void;
  currentWaitlistLength?: number;
}

export function AddToWaitlistModal({ isOpen, onClose, onSave, currentWaitlistLength = 4 }: AddToWaitlistModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [preference, setPreference] = useState("Indoor AC");
  const [estimatedWait, setEstimatedWait] = useState("~15m wait left");
  const [specialRequest, setSpecialRequest] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    onSave({
      name,
      phone,
      guests: Number(guests),
      preference,
      estimatedWait,
      waitedTime: "Just Joined",
      specialRequest: specialRequest || undefined,
      status: "waiting",
      time: Date.now(),
      partyTag: guests >= 6 ? "Large" : undefined,
    });

    // Reset
    setName("");
    setPhone("");
    setGuests(2);
    setSpecialRequest("");
    onClose();
  };

  return (
    <BaseDialog open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[480px] p-0 rounded-2xl border-slate-200">
        <Header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-pink-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <Title className="text-lg font-bold text-slate-900">Add Party to Waitlist</Title>
              <p className="text-xs text-slate-500">Queue a walk-in guest with estimated wait timer.</p>
            </div>
          </div>
        </Header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-between">
            <span className="font-semibold">Current Waitlist Position:</span>
            <span className="font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              #{currentWaitlistLength + 1} in queue
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Guest Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                required
                placeholder="e.g. Ananya Roy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Phone Number (+91) *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                required
                placeholder="+91 98000 11122"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Party Size</Label>
              <Select value={String(guests)} onValueChange={(v) => v && setGuests(Number(v))}>
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue placeholder="Guests" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} guest{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Est. Wait</Label>
              <Select value={estimatedWait} onValueChange={(val) => val && setEstimatedWait(val)}>
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue placeholder="Estimated wait" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="~5m wait left">~5m (Fast)</SelectItem>
                  <SelectItem value="~10m wait left">~10m</SelectItem>
                  <SelectItem value="~15m wait left">~15m</SelectItem>
                  <SelectItem value="~20m wait left">~20m</SelectItem>
                  <SelectItem value="~30m wait left">~30m+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Seating Preference</Label>
            <Select value={preference} onValueChange={(val) => val && setPreference(val)}>
              <SelectTrigger className="h-10 rounded-xl text-sm">
                <SelectValue placeholder="Preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Indoor AC">Indoor AC</SelectItem>
                <SelectItem value="Outdoor">Outdoor Patio</SelectItem>
                <SelectItem value="Prefers Booth">Prefers Booth</SelectItem>
                <SelectItem value="Family Hall">Family Hall</SelectItem>
                <SelectItem value="First Available">First Available (Any)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Special Request / Tag</Label>
            <Input
              placeholder="e.g. High chair, Wheelchair access"
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          <Footer className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 border-slate-200">
              Cancel
            </Button>
            <Button type="submit" className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-5 shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Add to Queue
            </Button>
          </Footer>
        </form>
      </Content>
    </BaseDialog>
  );
}
