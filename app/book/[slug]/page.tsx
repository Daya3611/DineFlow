"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Restaurant, Reservation, Waitlist, Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
  Loader2, Calendar, Users, CheckCircle, UtensilsCrossed,
  Phone, Mail, Clock, StickyNote, AlertCircle, ChevronRight, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TIME_SLOTS = [
  "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as any },
};

export default function BookSlugPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");

  const [dateReservations, setDateReservations] = useState<Reservation[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<"reservation" | "waitlist" | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    const fetchInit = async () => {
      try {
        let fetchedRestaurant: Restaurant | null = null;
        const slugQuery = query(collection(db, "restaurants"), where("customSlug", "==", slug));
        const slugSnap = await getDocs(slugQuery);
        if (!slugSnap.empty) {
          fetchedRestaurant = slugSnap.docs[0].data() as Restaurant;
        } else {
          const resDoc = await getDoc(doc(db, "restaurants", slug));
          if (resDoc.exists()) fetchedRestaurant = resDoc.data() as Restaurant;
        }
        if (fetchedRestaurant) {
          setRestaurant(fetchedRestaurant);
          const tQ = query(collection(db, "tables"), where("restaurantId", "==", fetchedRestaurant.id));
          const tSnap = await getDocs(tQ);
          setTables(tSnap.docs.map(d => d.data() as TableType));
        }
      } catch { toast.error("Failed to load restaurant details"); }
      finally { setLoading(false); }
    };
    fetchInit();
  }, [slug]);

  useEffect(() => {
    if (!restaurant?.id || !date) { setDateReservations([]); setTimeSlot(""); return; }
    const fetchReservations = async () => {
      setFetchingSlots(true);
      try {
        const rQ = query(
          collection(db, "reservations"),
          where("restaurantId", "==", restaurant.id),
          where("date", "==", date),
          where("status", "in", ["confirmed", "pending", "arrived"])
        );
        const rSnap = await getDocs(rQ);
        setDateReservations(rSnap.docs.map(d => d.data() as Reservation));
      } catch { toast.error("Failed to fetch slots"); }
      finally { setFetchingSlots(false); setTimeSlot(""); }
    };
    fetchReservations();
  }, [restaurant?.id, date]);

  const slotAvailability = useMemo(() => {
    if (!tables.length || !guestCount || !date) return null;
    const reqGuests = parseInt(guestCount, 10);
    const result: Record<string, { available: boolean; assignedTableId: string | null }> = {};
    TIME_SLOTS.forEach(slot => {
      const occupied = new Set(
        dateReservations.filter(r => r.time === slot).map(r => r.tableId).filter(Boolean)
      );
      const suitable = tables
        .filter(t => !occupied.has(t.id) && (t.capacity || 4) >= reqGuests)
        .sort((a, b) => (a.capacity || 4) - (b.capacity || 4));
      result[slot] = suitable.length > 0
        ? { available: true, assignedTableId: suitable[0].id }
        : { available: false, assignedTableId: null };
    });
    return result;
  }, [tables, guestCount, date, dateReservations]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id || !timeSlot || !date) return;
    if (!customerName.trim() || !phone.trim() || !guestCount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const slotInfo = slotAvailability?.[timeSlot] ?? null;
      if (slotInfo?.available && slotInfo.assignedTableId) {
        const resId = `res_${Date.now()}`;
        const newRes: Reservation = {
          id: resId, restaurantId: restaurant.id,
          customerName: customerName.trim(), phone: phone.trim(), email: email.trim(),
          date, time: timeSlot, durationMinutes: 60,
          tableId: slotInfo.assignedTableId,
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
          date, timeSlot, time: Date.now(), status: "waiting",
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
    setDate(""); setTimeSlot(""); setGuestCount(""); setNotes("");
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-200">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
          <p className="text-sm font-medium text-gray-500">Loading booking page…</p>
        </div>
      </div>
    );
  }

  /* ─── Not Found ─── */
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <motion.div {...fadeUp} className="text-center max-w-sm">
          <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <UtensilsCrossed className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-500 text-sm leading-relaxed">We couldn't find this booking link. Please check the URL or contact the restaurant.</p>
        </motion.div>
      </div>
    );
  }

  /* ─── Inactive ─── */
  if (restaurant.subscriptionStatus !== "active") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <motion.div {...fadeUp} className="text-center max-w-sm">
          <div className="h-20 w-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservations Unavailable</h1>
          <p className="text-gray-500 text-sm leading-relaxed">This restaurant is not currently accepting online reservations.</p>
        </motion.div>
      </div>
    );
  }

  /* ─── Success ─── */
  if (bookingSuccess) {
    const isWaitlist = bookingSuccess === "waitlist";
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 16 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.15, damping: 12 }}
            className={`h-24 w-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ${isWaitlist ? "bg-amber-500 shadow-amber-200" : "bg-green-600 shadow-green-200"}`}
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            {isWaitlist ? "You're on the List! 🎉" : "Booking Received! 🎉"}
          </h1>

          {/* Status card */}
          <div className={`rounded-2xl p-5 mb-6 text-left ${isWaitlist ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
            {isWaitlist ? (
              <>
                <p className="font-semibold text-amber-900 mb-1">Added to Waitlist</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  The selected slot is fully booked. We've added you to the waitlist and will notify you as soon as a table is available.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-green-900 mb-1">Pending Confirmation</p>
                <p className="text-sm text-green-700 leading-relaxed">
                  Your reservation request has been submitted. The restaurant will confirm your booking shortly.
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={resetForm}
              className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
            >
              Book Another Table
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Main Booking Form ─── */
  const isWaitlistSlot = timeSlot && slotAvailability && !slotAvailability[timeSlot]?.available;
  const isReadyToSubmit = timeSlot && customerName.trim() && phone.trim() && guestCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-xl shadow-gray-200/60">

        {/* ── Gradient Header ── */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 pb-8">
          <div className="flex items-center gap-4">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt={restaurant.name}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-white/30 shadow-lg" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-extrabold text-xl shadow-lg border border-white/20">
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-white leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-200 animate-pulse" />
                <p className="text-sm text-green-100 font-medium">Table Reservations</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Card ── */}
        <div className="flex-1 -mt-4 rounded-t-3xl bg-white overflow-y-auto">
          <form onSubmit={handleBooking} className="p-6 space-y-6 pb-28">

            {/* Section: Guest Info */}
            <motion.div {...fadeUp} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Guest Details</h2>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</Label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="9876543210" type="tel"
                      className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Optional" type="email"
                      className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Section: Availability */}
            <motion.div {...fadeUp} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Pick a Date & Time</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date" value={date}
                      onChange={e => setDate(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Guests *</Label>
                  <Select value={guestCount} onValueChange={v => { setGuestCount(v || ""); setTimeSlot(""); }}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500 transition-all">
                      <SelectValue placeholder="How many?" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "Person" : "People"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Time Slot Grid ── */}
              <AnimatePresence>
                {guestCount && date && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          <Clock className="h-3 w-3 inline mr-1" />Available Time Slots
                        </Label>
                        <div className="flex items-center gap-3 text-[10px] font-semibold">
                          <span className="flex items-center gap-1 text-green-600"><div className="h-2 w-2 rounded-full bg-green-500" />Open</span>
                          <span className="flex items-center gap-1 text-amber-600"><div className="h-2 w-2 rounded-full bg-amber-400" />Waitlist</span>
                        </div>
                      </div>

                      {fetchingSlots ? (
                        <div className="flex items-center justify-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                          <span className="ml-2 text-sm text-gray-500 font-medium">Checking availability…</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {TIME_SLOTS.map(slot => {
                            const isSelected = timeSlot === slot;
                            const info = slotAvailability?.[slot];
                            const isAvail = info?.available ?? true;

                            return (
                              <motion.button
                                key={slot}
                                type="button"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setTimeSlot(slot)}
                                className={`
                                  relative h-14 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border-2 overflow-hidden
                                  ${isSelected
                                    ? isAvail
                                      ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-200"
                                      : "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                                    : isAvail
                                      ? "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
                                      : "bg-gray-50 border-gray-100 text-gray-400"
                                  }
                                `}
                              >
                                <span className="leading-none">{slot}</span>
                                <span className={`text-[8px] uppercase tracking-widest font-extrabold leading-none ${isSelected ? "text-white/80" : isAvail ? "text-green-500" : "text-gray-400"}`}>
                                  {isAvail ? "Open" : "Wait"}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Waitlist Notice */}
              <AnimatePresence>
                {isWaitlistSlot && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4"
                  >
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">This slot is fully booked</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">You'll be added to the waitlist. We'll notify you if a table opens up!</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Section: Special Requests */}
            <motion.div {...fadeUp} className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <StickyNote className="h-3.5 w-3.5 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Special Requests</h2>
                <span className="text-xs text-gray-400 font-medium">(Optional)</span>
              </div>
              <Textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Birthday celebration, food allergies, high chair needed…"
                className="rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 min-h-[90px] resize-none transition-all"
              />
            </motion.div>

          </form>
        </div>

        {/* ── Sticky Submit ── */}
        <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-100">
          <motion.button
            type="button"
            onClick={(e) => {
              const formEl = document.querySelector("form");
              if (formEl) formEl.requestSubmit();
            }}
            disabled={submitting || !isReadyToSubmit}
            whileHover={isReadyToSubmit ? { scale: 1.02 } : {}}
            whileTap={isReadyToSubmit ? { scale: 0.98 } : {}}
            className={`w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg
              ${!isReadyToSubmit
                ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
                : isWaitlistSlot
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
              }`}
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
            ) : !timeSlot ? (
              "Select a time slot to continue"
            ) : !customerName.trim() || !phone.trim() ? (
              "Fill in your details above"
            ) : isWaitlistSlot ? (
              <><Star className="h-4.5 w-4.5 fill-current" /> Join Waitlist</>
            ) : (
              <><CheckCircle className="h-5 w-5" /> Confirm Reservation</>
            )}
          </motion.button>
          <p className="text-center text-xs text-gray-400 mt-2 font-medium">Powered by Dineflow</p>
        </div>
      </div>
    </div>
  );
}
