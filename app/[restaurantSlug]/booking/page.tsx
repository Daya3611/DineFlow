"use client";

import { useState, useEffect, useMemo, use } from "react";
import { db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Restaurant, Reservation, Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  Loader2, CheckCircle, User, Phone, Mail, Users,
  UtensilsCrossed, AlertCircle, Star, ChevronLeft,
  ChevronRight, StickyNote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay } from "date-fns";

/* ─── constants ─── */
const TIME_SLOTS = [
  "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];
const slotEnd = (s: string) => {
  const h = parseInt(s.split(":")[0]) + 1;
  return `${h.toString().padStart(2, "0")}:00`;
};

/* ─── slide animation ─── */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};
const slideTransition = { type: "tween", ease: "easeInOut", duration: 0.32 } as const;

type TableStatus = "green" | "red" | "yellow" | "grey";

/* ─── Table Card ─── */
function TableCard({
  table, status, selected, onClick,
}: {
  table: TableType; status: TableStatus; selected: boolean; onClick?: () => void;
}) {
  const isDisabled = status === "red" || status === "grey";
  const colors: Record<TableStatus, string> = {
    green: "bg-white border-gray-200 text-gray-800",
    yellow: "bg-amber-50 border-amber-300 text-amber-800",
    red: "bg-gray-100 border-gray-200 text-gray-400 opacity-60",
    grey: "bg-gray-100 border-gray-200 text-gray-400 opacity-50",
  };
  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.04, y: -2 } : {}}
      whileTap={!isDisabled ? { scale: 0.96 } : {}}
      onClick={isDisabled ? undefined : onClick}
      className={`
        relative rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-1
        h-24 transition-all shadow-sm select-none
        ${colors[status]}
        ${selected ? "!border-green-500 !bg-green-50 ring-2 ring-green-400/40" : ""}
        ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {selected && (
        <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      )}
      <span className="text-lg font-extrabold">{table.tableNumber}</span>
      <div className="flex items-center gap-1 text-[11px] font-semibold">
        <Users className="h-3 w-3" /> {table.capacity || 4}
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
        <span className={`h-1.5 w-1.5 rounded-full ${status === "green" ? "bg-green-500" : status === "yellow" ? "bg-amber-400" : "bg-gray-400"}`} />
        {status === "green" ? "Free" : status === "yellow" ? "Partial" : status === "grey" ? "Small" : "Taken"}
      </div>
    </motion.div>
  );
}

/* ─── Progress Bar ─── */
function StepProgress({ step, total = 3 }: { step: number; total?: number }) {
  const labels = ["Your details", "Date & time", "Choose table"];
  return (
    <div className="px-6 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`h-5 w-5 rounded-full text-[10px] font-extrabold flex items-center justify-center transition-all ${i + 1 <= step ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}>
              {i + 1 < step ? <CheckCircle className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-[11px] font-semibold hidden sm:block ${i + 1 <= step ? "text-green-600" : "text-gray-400"}`}>{label}</span>
            {i < total - 1 && <div className={`h-px flex-1 mx-1 w-6 ${i + 1 < step ? "bg-green-500" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-green-600 rounded-full"
          initial={false}
          animate={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>
      <p className="text-xs text-gray-400 font-semibold mt-2">Step {step} of {total}</p>
    </div>
  );
}

/* ─── Mini Calendar ─── */
function MiniCalendar({ selected, onSelect }: { selected: Date | undefined; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date());
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = getDay(startOfMonth(month)); // 0=Sun
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <span className="text-sm font-extrabold text-gray-900">{format(month, "MMMM yyyy")}</span>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isPast = isBefore(day, today);
          const isSel = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={`
                mx-auto h-8 w-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center
                ${isSel ? "bg-green-600 text-white shadow-md" : ""}
                ${isToday && !isSel ? "border-2 border-green-400 text-green-600" : ""}
                ${!isSel && !isToday ? "text-gray-700 hover:bg-gray-100" : ""}
                ${isPast ? "text-gray-300 cursor-not-allowed" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function BookSlugPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const resolvedParams = use(params);
  let slug = resolvedParams.restaurantSlug;
  if (slug.startsWith("%40")) slug = slug.substring(3);
  else if (slug.startsWith("@")) slug = slug.substring(1);

  /* ── page state ── */
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── step state ── */
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // +1 = forward, -1 = back

  /* ── form fields ── */
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  /* ── availability ── */
  const [dateReservations, setDateReservations] = useState<Reservation[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  /* ── submission ── */
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<"reservation" | "waitlist" | null>(null);

  /* ── OTP ── */
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  /* ── fetch restaurant ── */
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      try {
        let fetched: Restaurant | null = null;
        const snap = await getDocs(query(collection(db, "restaurants"), where("customSlug", "==", slug)));
        if (!snap.empty) {
          fetched = { id: snap.docs[0].id, ...snap.docs[0].data() } as Restaurant;
        } else {
          const d = await getDoc(doc(db, "restaurants", slug));
          if (d.exists()) fetched = { id: d.id, ...d.data() } as Restaurant;
        }
        if (fetched) {
          setRestaurant(fetched);
          const tSnap = await getDocs(query(collection(db, "tables"), where("restaurantId", "==", fetched.id)));
          setTables(tSnap.docs.map(d => d.data() as TableType));
        }
      } catch { toast.error("Failed to load restaurant"); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  /* ── fetch slots when date changes ── */
  useEffect(() => {
    if (!restaurant?.id || !dateStr) { setDateReservations([]); setTimeSlot(""); setSelectedTableId(null); return; }
    (async () => {
      setFetchingSlots(true);
      try {
        const rSnap = await getDocs(query(
          collection(db, "reservations"),
          where("restaurantId", "==", restaurant.id),
          where("date", "==", dateStr),
          where("status", "in", ["confirmed", "pending", "arrived"]),
        ));
        setDateReservations(rSnap.docs.map(d => d.data() as Reservation));
      } catch { toast.error("Failed to fetch slots"); }
      finally { setFetchingSlots(false); setTimeSlot(""); setSelectedTableId(null); }
    })();
  }, [restaurant?.id, dateStr]);

  /* ── OTP timer ── */
  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (timer > 0) iv = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  /* ── table status ── */
  const getTableStatus = (table: TableType): TableStatus => {
    if ((table.capacity || 4) < guestCount) return "grey";
    const occupied = dateReservations.some(r =>
      r.tableId === table.id && (r.slotStartTime === timeSlot || r.time === timeSlot)
    );
    if (occupied) return "red";
    const partial = dateReservations.some(r => r.tableId === table.id && r.slotStartTime !== timeSlot);
    return partial ? "yellow" : "green";
  };

  const isSlotAvailable = useMemo(() => {
    if (!timeSlot) return true;
    return tables.some(t => {
      if ((t.capacity || 4) < guestCount) return false;
      return !dateReservations.some(r => r.tableId === t.id && (r.slotStartTime === timeSlot || r.time === timeSlot));
    });
  }, [tables, guestCount, timeSlot, dateReservations]);

  /* ── navigation helpers ── */
  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goBack = () => { setDirection(-1); setStep(s => s - 1); };

  /* ── step 1 validation ── */
  const step1Valid = customerName.trim().length >= 2 && phone.trim().length >= 6;
  /* ── step 2 validation ── */
  const step2Valid = !!selectedDate && !!timeSlot;
  /* ── step 3: no table required but prompt for confirmation ── */
  const isWaitlist = timeSlot && !isSlotAvailable;

  /* ── submit (send OTP) ── */
  const handleBooking = async () => {
    if (!restaurant?.id) return;
    setSubmitting(true);
    try {
      const target = email.trim() || phone.trim();
      const res = await fetch("/api/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setTimer(300);
      setShowOtp(true);
      toast.success(`OTP sent to ${target}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally { setSubmitting(false); }
  };

  /* ── finalize (verify OTP + write to Firestore) ── */
  const finalizeBooking = async () => {
    if (!restaurant) return;
    if (otp.length !== 6) return toast.error("Enter 6-digit OTP");
    setVerifying(true);
    try {
      const target = email.trim() || phone.trim();
      const vpRes = await fetch("/api/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, otp }),
      });
      const vpData = await vpRes.json();
      if (!vpRes.ok) throw new Error(vpData.error || "Invalid OTP");

      let assignedId = selectedTableId;
      if (isSlotAvailable && !assignedId) {
        const best = tables
          .filter(t => { const s = getTableStatus(t); return s === "green" || s === "yellow"; })
          .sort((a, b) => (a.capacity || 4) - (b.capacity || 4));
        if (best.length) assignedId = best[0].id;
      }

      const type = isSlotAvailable ? "reservation" : "waitlist";
      const payload = {
        type,
        restaurantId: restaurant.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        date: dateStr,
        time: timeSlot,
        slotStartTime: timeSlot,
        slotEndTime: slotEnd(timeSlot),
        durationMinutes: 60,
        tableId: assignedId || undefined,
        guestCount: String(guestCount),
        notes: notes.trim(),
        otpVerified: true,
      };

      const res = await fetch("/api/booking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit booking");

      setShowOtp(false);
      setOtp("");
      setBookingSuccess(isSlotAvailable ? "reservation" : "waitlist");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally { setVerifying(false); }
  };

  const resetForm = () => {
    setBookingSuccess(null);
    setStep(1); setDirection(1);
    setCustomerName(""); setPhone(""); setEmail("");
    setSelectedDate(undefined); setTimeSlot(""); setGuestCount(2); setNotes("");
    setSelectedTableId(null);
  };

  /* ── LOADING ── */
  if (loading) return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-200">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Loading booking page…</p>
      </div>
    </div>
  );

  /* ── NOT FOUND ── */
  if (!restaurant) return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <UtensilsCrossed className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Restaurant Not Found</h1>
        <p className="text-gray-400 text-sm">We couldn't find this booking link.</p>
      </div>
    </div>
  );

  /* ── INACTIVE ── */
  if (restaurant.subscriptionStatus !== "active") return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="h-20 w-20 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Reservations Unavailable</h1>
        <p className="text-gray-400 text-sm">This restaurant isn't accepting bookings right now.</p>
      </div>
    </div>
  );

  /* ── SUCCESS ── */
  if (bookingSuccess) {
    const isWL = bookingSuccess === "waitlist";
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.15, damping: 10, stiffness: 200 }}
            className={`h-24 w-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl ${isWL ? "bg-amber-500 shadow-amber-200" : "bg-green-600 shadow-green-200"}`}
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
              {isWL ? "You're on the List! 🎉" : "Booking Received! 🎉"}
            </h1>
            <div className={`rounded-2xl p-5 mb-6 text-left ${isWL ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              {isWL ? (
                <><p className="font-bold text-amber-900 mb-1">Added to Waitlist</p>
                  <p className="text-sm text-amber-700 leading-relaxed">The slot is fully booked. We'll notify you when a table opens up.</p></>
              ) : (
                <><p className="font-bold text-green-900 mb-1">Pending Confirmation</p>
                  <p className="text-sm text-green-700 leading-relaxed">Your request is submitted. The restaurant will confirm shortly.</p></>
              )}
            </div>
            <Button onClick={resetForm} className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold border-0 rounded-2xl">
              Book Another Table
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     MULTI-STEP FORM SHELL
  ════════════════════════════════════════════ */
  return (
    <>
      <div className="min-h-screen bg-[#f0f4ff]">
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-2xl shadow-gray-200/50 relative overflow-hidden">

          {/* ── Top Bar ── */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
            {step > 1 && (
              <button onClick={goBack} className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shrink-0">
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="h-8 w-8 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-green-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 font-semibold">Booking at</p>
                <h1 className="text-sm font-extrabold text-gray-900 truncate">{restaurant.name}</h1>
              </div>
            </div>
          </div>

          {/* ── Step Progress ── */}
          <StepProgress step={step} />

          {/* ── Step Content (Animated) ── */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 overflow-y-auto"
              >

                {/* ══════ STEP 1 — USER DETAILS ══════ */}
                {step === 1 && (
                  <div className="p-6 space-y-5">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900">Booking table</h2>
                      <p className="text-sm text-gray-400 mt-1">Tell us who you are</p>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="John Smith"
                          className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-green-500 focus-visible:border-green-500 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          type="tel"
                          className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-green-500 focus-visible:border-green-500 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email <span className="text-gray-300 normal-case font-medium">(optional)</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="john@email.com"
                          type="email"
                          className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-green-500 focus-visible:border-green-500 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Guests */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Number of Guests *</label>
                      <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <button
                          onClick={() => setGuestCount(g => Math.max(1, g - 1))}
                          className="h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-lg font-bold hover:bg-gray-100 transition"
                        >−</button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-extrabold text-gray-900">{guestCount}</span>
                          <p className="text-xs text-gray-400 font-semibold">guests</p>
                        </div>
                        <button
                          onClick={() => setGuestCount(g => Math.min(20, g + 1))}
                          className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-bold hover:bg-green-700 transition shadow-md"
                        >+</button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" /> Special Requests <span className="text-gray-300 normal-case font-medium">(optional)</span>
                      </label>
                      <Textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Birthday celebration, food allergies, high chair…"
                        className="rounded-xl border-gray-200 focus-visible:ring-green-500 resize-none min-h-[80px] text-sm font-medium"
                      />
                    </div>

                    <div className="h-4" />
                  </div>
                )}

                {/* ══════ STEP 2 — DATE & TIME ══════ */}
                {step === 2 && (
                  <div className="p-6 space-y-5">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900">Date & time</h2>
                      <p className="text-sm text-gray-400 mt-1">When would you like to visit?</p>
                    </div>

                    <MiniCalendar selected={selectedDate} onSelect={d => setSelectedDate(d)} />

                    {selectedDate && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                          Time slot · {format(selectedDate, "EEE, d MMM")}
                        </label>
                        {fetchingSlots ? (
                          <div className="flex items-center justify-center h-20">
                            <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {TIME_SLOTS.map(slot => {
                              const taken = dateReservations.some(r =>
                                tables.every(t => {
                                  if ((t.capacity || 4) < guestCount) return true;
                                  return dateReservations.some(r2 => r2.tableId === t.id && (r2.slotStartTime === slot || r2.time === slot));
                                })
                              );
                              const isSelected = timeSlot === slot;
                              return (
                                <motion.button
                                  key={slot}
                                  whileHover={{ scale: 1.04 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setTimeSlot(slot)}
                                  className={`h-11 rounded-xl text-sm font-bold transition-all border-2 ${isSelected ? "bg-green-600 border-green-600 text-white shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-green-300"}`}
                                >
                                  {slot}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}

                    <div className="h-4" />
                  </div>
                )}

                {/* ══════ STEP 3 — TABLE SELECTION ══════ */}
                {step === 3 && (
                  <div className="p-6 space-y-5">
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900">Choose table</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        {format(selectedDate!, "EEE, d MMM")} · {timeSlot} · {guestCount} guest{guestCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold text-gray-500">
                      {[
                        { color: "bg-green-500", label: "Available" },
                        { color: "bg-amber-400", label: "Partially booked" },
                        { color: "bg-gray-300", label: "Taken / too small" },
                        { color: "bg-green-500", label: "Selected" },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Waitlist notice */}
                    {isWaitlist && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-semibold flex items-start gap-2">
                        <Star className="h-4 w-4 mt-0.5 shrink-0 fill-amber-400 text-amber-400" />
                        This slot is fully booked. You can still confirm to join the waitlist.
                      </motion.div>
                    )}

                    {/* Table grid */}
                    {tables.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">No tables configured yet.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {tables.map(t => (
                          <TableCard
                            key={t.id}
                            table={t}
                            status={getTableStatus(t)}
                            selected={selectedTableId === t.id}
                            onClick={() => setSelectedTableId(prev => prev === t.id ? null : t.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Skip hint */}
                    <p className="text-center text-xs text-gray-400 font-medium">
                      {selectedTableId ? "✅ Table selected — ready to confirm" : "Tap a table to select, or skip to auto-assign"}
                    </p>

                    <div className="h-4" />
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Sticky CTA ── */}
          <div className="shrink-0 px-5 pb-6 pt-3 bg-white border-t border-gray-100">
            {step === 1 && (
              <motion.button
                whileHover={step1Valid ? { scale: 1.02 } : {}}
                whileTap={step1Valid ? { scale: 0.97 } : {}}
                disabled={!step1Valid}
                onClick={goNext}
                className={`w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${step1Valid ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                {!customerName.trim() ? "Enter your name to continue" : !step1Valid ? "Enter phone number" : <>Next <ChevronRight className="h-5 w-5" /></>}
              </motion.button>
            )}

            {step === 2 && (
              <motion.button
                whileHover={step2Valid ? { scale: 1.02 } : {}}
                whileTap={step2Valid ? { scale: 0.97 } : {}}
                disabled={!step2Valid}
                onClick={goNext}
                className={`w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${step2Valid ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                {!selectedDate ? "Select a date first" : !timeSlot ? "Pick a time slot" : <>Next <ChevronRight className="h-5 w-5" /></>}
              </motion.button>
            )}

            {step === 3 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={submitting}
                onClick={handleBooking}
                className={`w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all ${isWaitlist ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"}`}
              >
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</> :
                  isWaitlist ? <><Star className="h-5 w-5 fill-current" /> Join Waitlist</> :
                    <><CheckCircle className="h-5 w-5" /> Confirm Reservation</>}
              </motion.button>
            )}

            <p className="text-center text-[10px] text-gray-400 mt-2 font-semibold tracking-widest uppercase">
              Powered by DineFlow
            </p>
          </div>

        </div>
      </div>

      {/* ── OTP Dialog ── */}
      <Dialog open={showOtp} onOpenChange={open => { if (!open) setShowOtp(false); }}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="mb-4 text-center">
            <DialogTitle className="text-xl font-extrabold text-gray-900">Verify Your Booking</DialogTitle>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              We've sent a 6-digit OTP to <strong className="text-gray-900">{email || phone}</strong>.<br />
              Enter it below to confirm your table.
            </p>
          </DialogHeader>

          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />)}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={finalizeBooking}
            disabled={verifying || otp.length !== 6}
            className="w-full h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white border-0 shadow-lg"
          >
            {verifying ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying…</> : <><CheckCircle className="h-5 w-5 mr-2" /> Verify & Book</>}
          </Button>

          <div className="mt-4 text-center">
            <button
              className={`text-sm font-semibold ${timer > 0 ? "text-gray-400 cursor-not-allowed" : "text-green-600 hover:underline"}`}
              disabled={timer > 0 || verifying || submitting}
              onClick={() => { if (timer === 0) { setOtp(""); handleBooking(); } }}
            >
              {timer > 0 ? `Resend OTP in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}` : "Resend OTP"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
