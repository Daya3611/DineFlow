"use client";

import { useState, useEffect, useMemo, use } from "react";
import { db } from "@/firebase";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { Restaurant, Reservation, Waitlist, Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
  Loader2, Calendar as CalIcon, Users, CheckCircle,
  UtensilsCrossed, Phone, Mail, Clock, StickyNote,
  AlertCircle, Star, MapPin, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

/* ─────────────── constants ─────────────── */
const TIME_SLOTS = [
  "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

const slotEnd = (s: string) => {
  const h = parseInt(s.split(":")[0]) + 1;
  return `${h.toString().padStart(2, "0")}:00`;
};

/* ─────────────── animation presets ─────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/* ─────────────── sub-components ─────────────── */

/** Section heading with icon */
function SectionHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-7 w-7 rounded-lg bg-green-100 flex items-center justify-center">
        <Icon className="h-4 w-4 text-green-600" />
      </div>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{label}</h2>
    </div>
  );
}

/** Skeleton for time slot grid */
function SlotSkeletons() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

/** Skeleton for table grid */
function TableSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

/** Time Slot Card */
function SlotCard({
  slot, selected, onClick,
}: {
  slot: string; selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={staggerItem}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative h-16 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 border-2 transition-all duration-200 shadow-sm
        ${selected
          ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-200"
          : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50 hover:shadow-md"
        }`}
    >
      <span className="text-sm leading-none font-extrabold">{slot}</span>
      <span className={`text-[9px] uppercase tracking-widest font-semibold leading-none ${selected ? "text-white/80" : "text-gray-400"}`}>
        {slotEnd(slot)} · Flex
      </span>
      {selected && (
        <motion.div
          layoutId="slot-selection"
          className="absolute inset-0 rounded-2xl border-2 border-green-400"
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
        />
      )}
    </motion.button>
  );
}

/** Table Card */
type TableStatus = "green" | "red" | "yellow" | "grey";

function TableCard({
  table, status, selected, onClick,
}: {
  table: TableType; status: TableStatus; selected: boolean; onClick: () => void;
}) {
  const clickable = status === "green" || status === "yellow";

  const colors: Record<TableStatus, string> = {
    green: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-400",
    red: "bg-red-50 border-red-200 text-red-700 opacity-60",
    yellow: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400",
    grey: "bg-gray-100 border-gray-200 text-gray-400",
  };

  const dots: Record<TableStatus, string> = {
    green: "bg-green-500", red: "bg-red-500", yellow: "bg-amber-400", grey: "bg-gray-300",
  };

  const labels: Record<TableStatus, string> = {
    green: "Available", red: "Occupied", yellow: "Reserved", grey: "Too small",
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={clickable ? { scale: 1.03, y: -4 } : {}}
      whileTap={clickable ? { scale: 0.97 } : {}}
      onClick={clickable ? onClick : undefined}
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between h-24 shadow-sm
        ${colors[status]}
        ${clickable ? "cursor-pointer" : "cursor-not-allowed"}
        ${selected ? "ring-2 ring-blue-400 border-blue-400 bg-blue-50 text-blue-900" : ""}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="h-4 w-4 text-blue-600" />
        </div>
      )}
      <div className="font-extrabold text-sm">T-{table.tableNumber}</div>
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {table.capacity || 4} seats
        </span>
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${dots[status]}`} />
          {labels[status]}
        </span>
      </div>
    </motion.div>
  );
}

/* ─────────────── main page ─────────────── */
export default function BookSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [inspectingTable, setInspectingTable] = useState<TableType | null>(null);

  const [dateReservations, setDateReservations] = useState<Reservation[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<"reservation" | "waitlist" | null>(null);

  // Derived date string
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  /* ── fetch restaurant + tables ── */
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      try {
        let fetched: Restaurant | null = null;
        const snap = await getDocs(query(collection(db, "restaurants"), where("customSlug", "==", slug)));
        if (!snap.empty) fetched = snap.docs[0].data() as Restaurant;
        else {
          const d = await getDoc(doc(db, "restaurants", slug));
          if (d.exists()) fetched = d.data() as Restaurant;
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

  /* ── fetch reservations on date change ── */
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

  /* ── table status calculator ── */
  const getTableStatus = (table: TableType): TableStatus => {
    const req = parseInt(guestCount || "0", 10);
    if ((table.capacity || 4) < req) return "grey";
    const occupiedInSlot = dateReservations.some(r =>
      r.tableId === table.id && (r.slotStartTime === timeSlot || r.time === timeSlot)
    );
    if (occupiedInSlot) return "red";
    const otherBooking = dateReservations.some(r =>
      r.tableId === table.id && r.slotStartTime !== timeSlot
    );
    return otherBooking ? "yellow" : "green";
  };

  /* ── slot-level availability ── */
  const isSlotAvailable = useMemo(() => {
    if (!timeSlot || !guestCount) return true;
    const req = parseInt(guestCount, 10);
    return tables.some(t => {
      if ((t.capacity || 4) < req) return false;
      return !dateReservations.some(r => r.tableId === t.id && (r.slotStartTime === timeSlot || r.time === timeSlot));
    });
  }, [tables, guestCount, timeSlot, dateReservations]);

  /* ── submit ── */
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id || !timeSlot || !dateStr) return;
    if (!customerName.trim() || !phone.trim() || !guestCount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      if (isSlotAvailable) {
        let assignedId = selectedTableId;
        if (!assignedId) {
          const best = tables
            .filter(t => { const s = getTableStatus(t); return s === "green" || s === "yellow"; })
            .sort((a, b) => (a.capacity || 4) - (b.capacity || 4));
          if (best.length) assignedId = best[0].id;
        }
        const resId = `res_${Date.now()}`;
        const newRes: Reservation = {
          id: resId, restaurantId: restaurant.id,
          customerName: customerName.trim(), phone: phone.trim(), email: email.trim(),
          date: dateStr,
          time: preferredTime || timeSlot,
          slotStartTime: timeSlot,
          slotEndTime: slotEnd(timeSlot),
          preferredTime: preferredTime || "",
          durationMinutes: 60,
          tableId: assignedId || undefined,
          guestCount: parseInt(guestCount, 10),
          status: "pending", notes: notes.trim(), createdAt: Date.now(),
        };
        await setDoc(doc(db, "reservations", resId), newRes);
        setBookingSuccess("reservation");
      } else {
        const waitId = `wait_${Date.now()}`;
        const newWait: Waitlist = {
          id: waitId, restaurantId: restaurant.id,
          name: customerName.trim(), phone: phone.trim(),
          guests: parseInt(guestCount, 10),
          date: dateStr, timeSlot, time: Date.now(), status: "waiting",
        };
        await setDoc(doc(db, "waitlist", waitId), newWait);
        setBookingSuccess("waitlist");
      }
    } catch { toast.error("Failed to submit. Please try again."); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setBookingSuccess(null);
    setCustomerName(""); setPhone(""); setEmail("");
    setSelectedDate(undefined); setTimeSlot(""); setGuestCount(""); setNotes("");
    setPreferredTime(""); setSelectedTableId(null);
  };

  const isReadyToSubmit = timeSlot && customerName.trim() && phone.trim() && guestCount;
  const isWaitlistSlot = timeSlot && !isSlotAvailable;
  const inspectingStatus = inspectingTable ? getTableStatus(inspectingTable) : "grey";

  /* ── loading ── */
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-200">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold text-gray-500 tracking-wide">Loading booking page…</p>
      </div>
    </div>
  );

  /* ── not found ── */
  if (!restaurant) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <motion.div {...fadeUp} className="text-center max-w-sm">
        <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <UtensilsCrossed className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Restaurant Not Found</h1>
        <p className="text-gray-400 text-sm leading-relaxed">We couldn't find this booking link.</p>
      </motion.div>
    </div>
  );

  /* ── inactive ── */
  if (restaurant.subscriptionStatus !== "active") return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      <motion.div {...fadeUp} className="text-center max-w-sm">
        <div className="h-20 w-20 rounded-3xl bg-red-100 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Reservations Unavailable</h1>
        <p className="text-gray-400 text-sm">This restaurant isn't accepting bookings right now.</p>
      </motion.div>
    </div>
  );

  /* ── success ── */
  if (bookingSuccess) {
    const isWL = bookingSuccess === "waitlist";
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 16, stiffness: 200 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.15, damping: 10, stiffness: 200 }}
            className={`h-24 w-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl
              ${isWL ? "bg-amber-500 shadow-amber-200" : "bg-green-600 shadow-green-200"}`}
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
            <Button onClick={resetForm} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200">
              Book Another Table
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ─────────────── MAIN FORM ─────────────── */
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-2xl shadow-gray-200/50">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 pb-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="flex items-center gap-4 relative">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name}
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-white/30 shadow-lg" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-extrabold text-2xl shadow-lg border border-white/20">
                  {restaurant.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-extrabold text-white leading-tight">{restaurant.name}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-200 animate-pulse" />
                  <p className="text-sm text-green-100 font-medium">Table Reservations Open</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Form ── */}
          <div className="flex-1 -mt-5 rounded-t-3xl bg-white overflow-y-auto">
            <form onSubmit={handleBooking} className="p-6 space-y-8 pb-32">

              {/* Guest Details */}
              <motion.div {...fadeUp} className="space-y-4">
                <SectionHead icon={Users} label="Guest Details" />

                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Full Name *</Label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                      placeholder="John Doe" required
                      className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="9876543210" type="tel" required
                        className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 transition-all" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="Optional" type="email"
                        className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="border-t border-gray-100" />

              {/* Date & Guests */}
              <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="space-y-5">
                <SectionHead icon={CalIcon} label="Date & Guests" />

                {/* Guest count */}
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Number of Guests *</Label>
                  <Select value={guestCount} onValueChange={v => { setGuestCount(v || ""); setTimeSlot(""); setSelectedTableId(null); }}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500 transition-all">
                      <SelectValue placeholder="How many guests?" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "Person" : "People"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar */}
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Pick a Date *</Label>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={d => {
                        setSelectedDate(d);
                        setTimeSlot("");
                        setSelectedTableId(null);
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="w-full"
                    />
                  </div>
                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2"
                    >
                      <CalIcon className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-xs font-bold text-green-800">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Time Slots */}
              <AnimatePresence>
                {guestCount && selectedDate && (
                  <motion.div
                    key="slots"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 pt-8 space-y-4">
                      <SectionHead icon={Clock} label="Select Time Block" />

                      {fetchingSlots ? <SlotSkeletons /> : (
                        <motion.div className="grid grid-cols-3 gap-2.5" variants={stagger} initial="initial" animate="animate">
                          {TIME_SLOTS.map(slot => (
                            <SlotCard
                              key={slot}
                              slot={slot}
                              selected={timeSlot === slot}
                              onClick={() => { setTimeSlot(slot); setSelectedTableId(null); }}
                            />
                          ))}
                        </motion.div>
                      )}

                      {/* Preferred arrival time */}
                      <AnimatePresence>
                        {timeSlot && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2"
                          >
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest block flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                              Preferred Arrival Time (Optional)
                            </Label>
                            <div className="relative">
                              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                              <Input
                                type="time" step="900"
                                value={preferredTime}
                                onChange={e => setPreferredTime(e.target.value)}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 transition-all font-semibold"
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">
                              Your 1-hour slot <strong>{timeSlot}–{slotEnd(timeSlot)}</strong> is reserved regardless of arrival time.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Waitlist notice */}
                      <AnimatePresence>
                        {isWaitlistSlot && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4"
                          >
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-900">This slot is fully booked</p>
                              <p className="text-xs text-amber-700 mt-0.5">You'll be added to the waitlist — we'll notify you if a table opens.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table Layout */}
              <AnimatePresence>
                {guestCount && selectedDate && timeSlot && !isWaitlistSlot && (
                  <motion.div
                    key="tables"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 pt-8 space-y-4">
                      <div className="flex items-start justify-between">
                        <SectionHead icon={MapPin} label="Choose Your Table" />
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1.5">Optional</span>
                      </div>

                      {/* Legend */}
                      <div className="flex gap-3 flex-wrap">
                        {[
                          { color: "bg-green-500", label: "Available" },
                          { color: "bg-red-500", label: "Occupied" },
                          { color: "bg-amber-400", label: "Reserved" },
                          { color: "bg-gray-300", label: "Too small" },
                        ].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                            {label}
                          </div>
                        ))}
                      </div>

                      {fetchingSlots ? <TableSkeletons /> : (
                        <motion.div className="grid grid-cols-2 gap-3" variants={stagger} initial="initial" animate="animate">
                          {tables.map(t => (
                            <TableCard
                              key={t.id}
                              table={t}
                              status={getTableStatus(t)}
                              selected={selectedTableId === t.id}
                              onClick={() => setInspectingTable(t)}
                            />
                          ))}
                        </motion.div>
                      )}

                      {selectedTableId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5"
                        >
                          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                          <p className="text-xs font-bold text-blue-800">
                            Table T-{tables.find(t => t.id === selectedTableId)?.tableNumber} selected
                          </p>
                          <button type="button" onClick={() => setSelectedTableId(null)}
                            className="ml-auto text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-wide">
                            Clear
                          </button>
                        </motion.div>
                      )}
                      <p className="text-[10px] text-center text-gray-400 font-medium">Leave unselected for smart auto-assignment.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-gray-100" />

              {/* Special Requests */}
              <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="space-y-2">
                <SectionHead icon={StickyNote} label="Special Requests" />
                <Textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Birthday celebration, food allergies, high chair needed…"
                  className="rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 min-h-[90px] resize-none transition-all"
                />
              </motion.div>

            </form>
          </div>

          {/* ── Sticky CTA ── */}
          <div className="sticky bottom-0 p-4 bg-white/96 backdrop-blur-md border-t border-gray-100 z-10">
            <motion.button
              type="button"
              onClick={() => { const f = document.querySelector("form"); if (f) f.requestSubmit(); }}
              disabled={submitting || !isReadyToSubmit}
              whileHover={isReadyToSubmit ? { scale: 1.02 } : {}}
              whileTap={isReadyToSubmit ? { scale: 0.97 } : {}}
              className={`w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2.5 shadow-lg
                ${!isReadyToSubmit
                  ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
                  : isWaitlistSlot
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                    : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                }`}
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
              ) : !selectedDate ? (
                "Select a date to continue"
              ) : !guestCount ? (
                "Select number of guests"
              ) : !timeSlot ? (
                "Pick a time slot"
              ) : !customerName.trim() || !phone.trim() ? (
                "Fill in your details above"
              ) : isWaitlistSlot ? (
                <><Star className="h-5 w-5 fill-current" /> Join Waitlist</>
              ) : (
                <><CheckCircle className="h-5 w-5" /> Confirm Reservation</>
              )}
            </motion.button>
            <p className="text-center text-[10px] text-gray-400 mt-2 font-semibold tracking-wide uppercase">Powered by DineFlow</p>
          </div>
        </div>
      </div>

      {/* ── Table Inspect Dialog ── */}
      <Dialog open={!!inspectingTable} onOpenChange={(o) => { if (!o) setInspectingTable(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className={`p-6 ${
            inspectingStatus === "green" ? "bg-green-600" :
            inspectingStatus === "yellow" ? "bg-amber-500" : "bg-gray-500"
          }`}>
            <DialogHeader>
              <DialogTitle className="text-white text-2xl font-extrabold">
                Table T-{inspectingTable?.tableNumber}
              </DialogTitle>
              <p className="text-white/80 text-sm font-semibold mt-1">
                {inspectingTable?.capacity || 4} seats capacity
              </p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Status for {timeSlot}–{slotEnd(timeSlot || "11:00")}</p>
              <div className="flex items-center gap-2 font-bold text-sm">
                {inspectingStatus === "green" && <><div className="h-3 w-3 rounded-full bg-green-500" /><span className="text-green-700">Available</span></>}
                {inspectingStatus === "yellow" && <><div className="h-3 w-3 rounded-full bg-amber-400" /><span className="text-amber-700">Reserved at other times today</span></>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-2xl font-extrabold text-gray-900">T-{inspectingTable?.tableNumber}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">Table ID</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-2xl font-extrabold text-gray-900">{inspectingTable?.capacity || 4}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">Seat Capacity</p>
              </div>
            </div>

            <Button
              onClick={() => { if (inspectingTable) { setSelectedTableId(inspectingTable.id); setInspectingTable(null); } }}
              className="w-full h-12 rounded-xl font-bold text-base bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 transition-all"
            >
              <CheckCircle className="h-5 w-5 mr-2" /> Select This Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
