"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Restaurant, Table as TableType, Reservation } from "@/types";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfDay,
  getDay,
} from "date-fns";
import { BookingSuccessModal, BookingSuccessDetails } from "@/components/customer/BookingSuccessModal";

interface BookTableClientProps {
  restaurant: Restaurant;
  slug: string;
}

const LUNCH_SLOTS = ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"];
const DINNER_SLOTS = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"];

/* ── Interactive Inline Calendar Component ── */
function InlineCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPad = getDay(startOfMonth(currentMonth));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 mt-3">
      {/* Month & Nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="h-8 w-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center transition text-slate-700 font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="h-8 w-8 rounded-full hover:bg-slate-200/70 flex items-center justify-center transition text-slate-700 font-bold"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {dayNames.map((d) => (
          <div key={d} className="text-[10px] font-extrabold text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const isPast = isBefore(day, today);
          const isSel = isSameDay(day, selectedDate);
          const isTod = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(day)}
              className={`h-9 w-9 mx-auto rounded-xl text-xs font-extrabold transition flex items-center justify-center ${
                isSel
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-400/40"
                  : isTod
                  ? "border-2 border-emerald-500 text-emerald-800 font-black bg-emerald-50"
                  : isPast
                  ? "text-slate-300 cursor-not-allowed opacity-40"
                  : "text-slate-700 hover:bg-slate-200/60"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookTableClient({ restaurant, slug }: BookTableClientProps) {
  const [guestCount, setGuestCount] = useState<number>(4);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("7:30 PM");

  const [tables, setTables] = useState<TableType[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Customer Details Form
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<BookingSuccessDetails | null>(null);

  // Quick dates (Today, Tomorrow, +2 days)
  const quickDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 4 }).map((_, i) => addDays(today, i));
  }, []);

  const activeDateObj = useMemo(() => {
    return {
      date: selectedDate,
      formattedStr: format(selectedDate, "yyyy-MM-dd"),
      label: format(selectedDate, "EEE, MMM dd"),
      shortDay: format(selectedDate, "EEE"),
    };
  }, [selectedDate]);

  // Subscribe Real Tables
  useEffect(() => {
    if (!restaurant?.id) return;
    const qTables = query(collection(db, "tables"), where("restaurantId", "==", restaurant.id));
    const unsubscribe = onSnapshot(qTables, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TableType[];
      setTables(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  // Subscribe Real Reservations for Active Date
  useEffect(() => {
    if (!restaurant?.id || !activeDateObj.formattedStr) return;
    const qRes = query(
      collection(db, "reservations"),
      where("restaurantId", "==", restaurant.id),
      where("date", "==", activeDateObj.formattedStr)
    );
    const unsubscribe = onSnapshot(qRes, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
      setReservations(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id, activeDateObj.formattedStr]);

  // Real Table Availability Checker
  const getSlotAvailability = (timeStr: string) => {
    const compatibleTables = tables.filter((t) => (t.capacity || 4) >= guestCount);
    const totalTables = compatibleTables.length > 0 ? compatibleTables.length : Math.max(1, tables.length || 4);

    const takenCount = reservations.filter(
      (r) => r.time === timeStr && ["confirmed", "pending", "seated"].includes(r.status)
    ).length;

    const availableCount = Math.max(0, totalTables - takenCount);

    if (availableCount > 2) {
      return { status: "available", label: `${availableCount} tables free`, isFull: false };
    } else if (availableCount > 0) {
      return { status: "limited", label: `Only ${availableCount} left!`, isFull: false };
    } else {
      return { status: "full", label: "Fully booked", isFull: true };
    }
  };

  const currentSlotInfo = useMemo(() => getSlotAvailability(selectedTimeSlot), [selectedTimeSlot, tables, reservations, guestCount]);

  const handleSendOtp = async () => {
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setSubmitting(true);
    try {
      const target = email.trim() || phone.trim();
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to send OTP");
      }
      setShowOtp(true);
      toast.success(`OTP sent to ${target}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeBooking = async () => {
    if (otp.length !== 6) return toast.error("Enter 6-digit OTP");
    setVerifying(true);
    try {
      const target = email.trim() || phone.trim();
      const vpRes = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, otp }),
      });
      if (!vpRes.ok) throw new Error("Invalid OTP");

      const isWaitlist = currentSlotInfo.isFull;
      const type = isWaitlist ? "waitlist" : "reservation";

      const payload = {
        type,
        restaurantId: restaurant.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        date: activeDateObj.formattedStr,
        time: selectedTimeSlot,
        guestCount: String(guestCount),
        occasion: occasion || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      const bookingId = data.id || `res_${Date.now()}`;
      const codeSuffix = bookingId.slice(-6).toUpperCase();
      const bookingCode = `DF-${codeSuffix}`;

      setConfirmedBookingDetails({
        bookingId,
        bookingCode,
        restaurantName: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phoneNumber,
        date: activeDateObj.label,
        time: selectedTimeSlot,
        guests: guestCount,
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        type,
      });

      setShowOtp(false);
      toast.success(isWaitlist ? "Added to waitlist!" : "Table booked successfully!");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 select-none">
      <CustomerHeaderNav restaurant={restaurant} slug={slug} activeTab="book" />

      <main className="max-w-[900px] mx-auto px-4 pt-6 space-y-6">
        {/* Title Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs mb-1 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Real-time Table Reservation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Book a Table at {restaurant.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Choose your date, time and number of guests.
          </p>
        </div>

        {/* STEP 1: GUESTS */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
            STEP 1: NUMBER OF GUESTS
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                onClick={() => setGuestCount(num)}
                className={`h-12 w-12 rounded-2xl text-base font-extrabold transition-all border shrink-0 ${
                  guestCount === num
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2: DATE WITH VISUAL INTERACTIVE CALENDAR */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              STEP 2: SELECT DATE
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {showCalendar ? "Hide Calendar" : "Toggle Full Calendar"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {quickDates.map((d, idx) => {
              const isSelected = isSameDay(d, selectedDate);
              const label =
                idx === 0
                  ? `Today (${format(d, "MMM dd")})`
                  : idx === 1
                  ? `Tomorrow (${format(d, "MMM dd")})`
                  : format(d, "EEE dd MMM");

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`p-3.5 rounded-2xl text-center border transition-all ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[10px] font-extrabold uppercase opacity-80">
                    {format(d, "EEE")}
                  </p>
                  <p className="text-sm font-extrabold mt-0.5">{label}</p>
                </button>
              );
            })}

            {/* Calendar Toggle Button */}
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-3.5 rounded-2xl text-center border transition-all flex flex-col items-center justify-center ${
                showCalendar || !quickDates.some((qd) => isSameDay(qd, selectedDate))
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <CalendarIcon className="h-4 w-4 mb-0.5" />
              <span className="text-xs font-extrabold">
                {!quickDates.some((qd) => isSameDay(qd, selectedDate))
                  ? format(selectedDate, "MMM dd")
                  : "More Dates"}
              </span>
            </button>
          </div>

          {/* Interactive Visual Month Calendar Component */}
          {showCalendar && (
            <InlineCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
              }}
            />
          )}
        </section>

        {/* STEP 3: TIME SLOTS */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
            STEP 3: SELECT TIME SLOT
          </label>

          {/* Lunch */}
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Lunch Slots</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {LUNCH_SLOTS.map((slot) => {
                const info = getSlotAvailability(slot);
                const isSelected = selectedTimeSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : info.isFull
                        ? "bg-slate-100 border-slate-200 text-slate-400"
                        : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300"
                    }`}
                  >
                    <p className="text-sm font-extrabold">{slot}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? "text-emerald-100" : info.isFull ? "text-red-500" : "text-slate-500"}`}>
                      {info.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dinner */}
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Dinner Slots</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DINNER_SLOTS.map((slot) => {
                const info = getSlotAvailability(slot);
                const isSelected = selectedTimeSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : info.isFull
                        ? "bg-slate-100 border-slate-200 text-slate-400"
                        : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300"
                    }`}
                  >
                    <p className="text-sm font-extrabold">{slot}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? "text-emerald-100" : info.isFull ? "text-red-500" : "text-slate-500"}`}>
                      {info.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* STEP 4: CUSTOMER DETAILS */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
            STEP 4: YOUR DETAILS
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">Full Name *</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul Sharma" className="h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-500 block mb-1">Phone Number *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" className="h-11 rounded-xl" />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 block mb-1">Email (Optional)</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@example.com" type="email" className="h-11 rounded-xl" />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-500 block mb-1">Special Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="High chair, birthday setup..." className="rounded-xl min-h-[70px]" />
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={submitting || !customerName.trim() || !phone.trim()}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md mt-4"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : currentSlotInfo.isFull ? "Join Waitlist →" : "Confirm Booking →"}
          </Button>
        </section>
      </main>

      {/* OTP Dialog */}
      <Dialog open={showOtp} onOpenChange={setShowOtp}>
        <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold">Enter Verification OTP</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg font-bold" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button onClick={handleFinalizeBooking} disabled={verifying || otp.length !== 6} className="w-full h-12 rounded-xl bg-emerald-600 text-white font-extrabold">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Book"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Premium Booking Celebration & Success Modal */}
      <BookingSuccessModal
        open={Boolean(confirmedBookingDetails)}
        onClose={() => setConfirmedBookingDetails(null)}
        bookingDetails={confirmedBookingDetails}
      />
    </div>
  );
}
