"use client";

import React, { useState } from "react";
import { Dialog as BaseDialog, DialogContent as Content, DialogHeader as Header, DialogTitle as Title, DialogFooter as Footer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, Users, MapPin, Sparkles, User, Phone, Mail, CheckCircle2 } from "lucide-react";
import { Reservation } from "@/types";

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Partial<Reservation>) => void;
  availableTables?: Array<{ id: string; tableNumber: string; capacity: number; location: string; status: string }>;
}

export function NewBookingModal({ isOpen, onClose, onSave, availableTables = [] }: NewBookingModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("2026-04-24");
  const [time, setTime] = useState("13:00");
  const [guestCount, setGuestCount] = useState(2);
  const [seatingPreference, setSeatingPreference] = useState("Indoor AC");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [occasion, setOccasion] = useState("None");
  const [specialRequest, setSpecialRequest] = useState("");
  const [notes, setNotes] = useState("");
  const [isVip, setIsVip] = useState(false);

  const tables = availableTables.length > 0 ? availableTables : [
    { id: "t1", tableNumber: "T-1", capacity: 2, location: "Indoor AC", status: "free" },
    { id: "t2", tableNumber: "T-2", capacity: 4, location: "Indoor AC", status: "free" },
    { id: "t3", tableNumber: "T-3", capacity: 4, location: "Indoor AC", status: "occupied" },
    { id: "t4", tableNumber: "T-4", capacity: 6, location: "Indoor AC", status: "free" },
    { id: "t5", tableNumber: "T-5", capacity: 2, location: "Outdoor Patio", status: "free" },
    { id: "t6", tableNumber: "T-6", capacity: 4, location: "Outdoor Patio", status: "free" },
    { id: "p1", tableNumber: "P-1", capacity: 8, location: "Private Dining", status: "free" },
  ];

  const filteredTables = tables.filter(t => t.capacity >= guestCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    const tableObj = tables.find(t => t.id === selectedTableId);
    const tableName = tableObj ? `Table ${tableObj.tableNumber} (${tableObj.location})` : (seatingPreference ? `Table (${seatingPreference})` : "Table Unassigned");

    onSave({
      customerName,
      phone,
      email: email || undefined,
      date,
      time,
      guestCount: Number(guestCount),
      seatingPreference,
      tableId: selectedTableId || undefined,
      tableName,
      status: "confirmed",
      specialRequest: specialRequest || undefined,
      occasion: occasion !== "None" ? occasion : undefined,
      notes: notes || undefined,
      isVipRegular: isVip,
      countdown: "In 1h 30m",
      createdAt: Date.now(),
    });

    setCustomerName("");
    setPhone("");
    setEmail("");
    setGuestCount(2);
    setSpecialRequest("");
    setNotes("");
    setSelectedTableId("");
    onClose();
  };

  return (
    <BaseDialog open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        <Header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#008A45]/10 text-[#008A45] flex items-center justify-center font-bold">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <Title className="text-lg font-bold text-slate-900">New Table Booking</Title>
              <p className="text-xs text-slate-500">Create a confirmed guest reservation with table assignment.</p>
            </div>
          </div>
        </Header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Guest Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> Guest Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Guest Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Phone Number (+91) *</Label>
                <Input
                  required
                  placeholder="+91 98451 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Email Address (Optional)</Label>
                <Input
                  type="email"
                  placeholder="guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="rounded border-slate-300 text-[#008A45] focus:ring-[#008A45] h-4 w-4"
                  />
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Mark as VIP / Regular Guest
                  </span>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Date, Time & Guests */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" /> Schedule & Party Size
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Time</Label>
                <Select value={time} onValueChange={(val) => val && setTime(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {["11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "15:00", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Party Size</Label>
                <Select value={String(guestCount)} onValueChange={(val) => val && setGuestCount(Number(val))}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map((num) => (
                      <SelectItem key={num} value={String(num)}>{num} guest{num > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Seating Preference & Table Allocation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> Table Allocation & Preference
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Seating Preference</Label>
                <Select value={seatingPreference} onValueChange={(val) => val && setSeatingPreference(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indoor AC">Indoor AC Main Hall</SelectItem>
                    <SelectItem value="Outdoor Patio">Outdoor Patio</SelectItem>
                    <SelectItem value="Window">Window View Table</SelectItem>
                    <SelectItem value="Booth">Private Booth</SelectItem>
                    <SelectItem value="Private Dining">Private Dining / Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Select Specific Table</Label>
                <Select value={selectedTableId} onValueChange={(val) => val && setSelectedTableId(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Auto-assign or select table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign Best Available Table</SelectItem>
                    {filteredTables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tableNumber} ({t.location}) - Cap: {t.capacity} {t.status === "free" ? "✓ Free" : "Occupied"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Occasion & Requests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Occasion</Label>
              <Select value={occasion} onValueChange={(val) => val && setOccasion(val)}>
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Regular Dining</SelectItem>
                  <SelectItem value="Birthday">Birthday Celebration</SelectItem>
                  <SelectItem value="Anniversary">Anniversary</SelectItem>
                  <SelectItem value="Business">Business Lunch/Dinner</SelectItem>
                  <SelectItem value="Family Gathering">Family Gathering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Special Requests</Label>
              <Input
                placeholder="e.g. High Chair Needed, Dessert Request"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Staff Operational Notes</Label>
            <Textarea
              placeholder="Internal notes for host/waiters..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-sm min-h-[60px]"
            />
          </div>

          <Footer className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-11 border-slate-200">
              Cancel
            </Button>
            <Button type="submit" className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-11 px-6 shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Create Booking
            </Button>
          </Footer>
        </form>
      </Content>
    </BaseDialog>
  );
}
