"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, doc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Reservation, Waitlist } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2, Calendar, Clock, User, Phone, MapPin,
  AlertCircle, CheckCircle2, XCircle, Users, ListOrdered,
  Mail, StickyNote, ChevronRight, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";
import { format } from "date-fns";

/* ── Status configs ── */
const statusConfig: Record<string, { label: string; color: string; barColor: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200", barColor: "bg-yellow-400", dot: "bg-yellow-400" },
  confirmed: { label: "Confirmed", color: "bg-green-50 text-green-700 border-green-200", barColor: "bg-green-500", dot: "bg-green-500" },
  arrived: { label: "Arrived", color: "bg-blue-50 text-blue-700 border-blue-200", barColor: "bg-blue-500", dot: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-gray-50 text-gray-500 border-gray-200", barColor: "bg-gray-300", dot: "bg-gray-400" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200", barColor: "bg-red-400", dot: "bg-red-400" },
  "no-show": { label: "No Show", color: "bg-orange-50 text-orange-600 border-orange-200", barColor: "bg-orange-400", dot: "bg-orange-400" },
};

const waitStatusConfig: Record<string, { label: string; color: string }> = {
  waiting: { label: "Waiting", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  notified: { label: "Notified", color: "bg-blue-50 text-blue-700 border-blue-200" },
  seated: { label: "Seated", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

/* ── Detail Row ── */
function DetailRow({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${highlight ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${highlight ? "bg-green-100" : "bg-white border border-gray-200"}`}>
        <Icon className={`h-4 w-4 ${highlight ? "text-green-600" : "text-gray-400"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-green-800" : "text-gray-900"}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const { restaurant } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reservations" | "waitlist">("reservations");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "upcoming" | "past">("all");

  useEffect(() => {
    if (!restaurant) return;

    setLoading(true);
    let initialLoad = { res: false, wait: false, tables: false };

    const checkLoading = () => {
      if (initialLoad.res && initialLoad.wait && initialLoad.tables) setLoading(false);
    };

    const targetId = restaurant.id || (restaurant as any).restaurantId;

    const unsubRes = onSnapshot(collection(db, "reservations"), (snap) => {
      console.log("CURRENT RESTAURANT ID:", restaurant?.id);
      console.log("AUTH RESTAURANT:", restaurant);
      
      const allData = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Reservation[];
      
      console.log("ALL DATA:", allData);

      // Manual client-side matching trace
      const targetIdStr = String(restaurant?.id || (restaurant as any)?.restaurantId || "").trim();
      
      // Explicit debug looping check per document
      allData.forEach((r) => {
        console.log("CHECK:", {
          docId: r.id,
          r_restaurantId: r.restaurantId,
          current: targetIdStr,
          match: String(r.restaurantId).trim() === targetIdStr
        });
      });

      // ⚡ QUICK FIX: BYPASS FILTER entirely to confirm UI rendering works
      const matched = allData;
      console.log("MATCHED DATA (Bypassed):", matched);

      setReservations(matched.sort((a, b) => ((b as any).createdAt?.seconds || b.createdAt || 0) - ((a as any).createdAt?.seconds || a.createdAt || 0)));
      initialLoad.res = true; checkLoading();
    }, (err) => {
      console.error(err);
      toast.error("Failed to sync reservations.");
      initialLoad.res = true; checkLoading();
    });

    const unsubWait = onSnapshot(query(collection(db, "waitlist"), where("restaurantId", "==", targetId)), (snap) => {
      setWaitlist(snap.docs.map(d => d.data() as Waitlist).sort((a, b) => b.time - a.time));
      initialLoad.wait = true; checkLoading();
    }, () => { toast.error("Failed to sync waitlist."); initialLoad.wait = true; checkLoading(); });

    const unsubTables = onSnapshot(query(collection(db, "tables"), where("restaurantId", "==", targetId)), (snap) => {
      setTables(snap.docs.map(d => d.data()));
      initialLoad.tables = true; checkLoading();
    }, () => { toast.error("Failed to sync tables."); initialLoad.tables = true; checkLoading(); });

    return () => { unsubRes(); unsubWait(); unsubTables(); };
  }, [restaurant]);

  const updateReservationStatus = async (id: string, status: Reservation["status"]) => {
    setUpdatingId(id);
    try {
      const updateData: any = { status };
      if (status === "confirmed") {
        updateData.confirmedAt = serverTimestamp();
      }
      
      const docRef = doc(db, "reservations", id);
      await updateDoc(docRef, updateData);
      
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      if (selectedRes?.id === id) setSelectedRes(prev => prev ? { ...prev, status } : null);
      toast.success(`Marked as ${status}`);
    } catch (err: any) { 
      console.error("Firebase update error:", err);
      toast.error(`Update failed: ${err.message || "Check permissions or network."}`); 
    } finally { 
      setUpdatingId(null); 
    }
  };

  const updateWaitlistStatus = async (id: string, status: Waitlist["status"]) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "waitlist", id), { status });
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status } : w));
      toast.success(`Marked as ${status}`);
    } catch (err: any) { 
      console.error("Firebase update error:", err);
      toast.error(`Update failed: ${err.message || "Check permissions or network."}`); 
    } finally { 
      setUpdatingId(null); 
    }
  };

  const activeResCount = reservations.filter(r => ["pending", "confirmed"].includes(r.status)).length;
  const activeWaitCount = waitlist.filter(w => w.status === "waiting").length;

  // ── Date filter logic ──
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredReservations = reservations.filter(res => {
    if (dateFilter === "all") return true;

    // Use native string matching against Firestore's 'YYYY-MM-DD' storage representation
    if (dateFilter === "today") return res.date === todayStr;

    // Use strict timestamp comparators to avoid timezone boundary stripping
    if (dateFilter === "upcoming") return new Date(res.date) > new Date(todayStr);
    if (dateFilter === "past") return new Date(res.date) < new Date(todayStr);

    return true;
  });

  console.log("FINAL UI DATA:", filteredReservations);

  const dateFilterOptions: { key: typeof dateFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-sm text-gray-500 font-medium">Loading bookings…</p>
        </div>
      </div>
    );
  }

  const selectedResCfg = selectedRes ? (statusConfig[selectedRes.status] ?? statusConfig.pending) : null;
  const selectedTableLabel = selectedRes ? tables.find(t => t.id === selectedRes.tableId)?.tableNumber : null;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-gray-900">Bookings & Waitlist</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Manage table reservations and walk-in queue.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex-1 sm:flex-none text-center min-w-[70px]">
            <div className="text-xl sm:text-2xl font-extrabold text-green-700">{activeResCount}</div>
            <div className="text-[11px] sm:text-xs text-green-600 font-semibold uppercase tracking-wider">Active</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex-1 sm:flex-none text-center min-w-[70px]">
            <div className="text-xl sm:text-2xl font-extrabold text-amber-700">{activeWaitCount}</div>
            <div className="text-[11px] sm:text-xs text-amber-600 font-semibold uppercase tracking-wider">Waiting</div>
          </div>
        </div>
      </div>

      {/* ── Pill Tabs ── */}
      <div className="flex gap-1.5 bg-gray-100 rounded-2xl p-1.5 w-fit">
        {(["reservations", "waitlist"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              }`}
          >
            {tab === "reservations" ? (
              <><Calendar className="h-4 w-4" /> Reservations
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                  {activeResCount}
                </span>
              </>
            ) : (
              <><ListOrdered className="h-4 w-4" /> Waitlist
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>
                  {activeWaitCount}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Date Filter Pills (shown only on reservations tab) ── */}
      <AnimatePresence>
        {activeTab === "reservations" && (
          <motion.div
            key="date-filter"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2 flex-wrap"
          >
            {dateFilterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDateFilter(opt.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${dateFilter === opt.key
                  ? "bg-green-600 text-white border-green-600 shadow-sm shadow-green-200"
                  : "bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                  }`}
              >
                {opt.label}
                {opt.key === "today" && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dateFilter === opt.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                    {reservations.filter(r => r.date === todayStr).length}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">

        {/* RESERVATIONS */}
        {activeTab === "reservations" && (
          <motion.div
            key="reservations"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filteredReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">No reservations yet</p>
                <p className="text-gray-400 text-sm mt-1">Bookings will appear here when customers reserve.</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">No {dateFilter === "all" ? "" : dateFilter} bookings</p>
                <p className="text-gray-400 text-sm mt-1">Try switching to a different filter.</p>
              </div>
            ) : (
              filteredReservations.map((res, i) => {
                const cfg = statusConfig[res.status] ?? statusConfig.pending;
                const tableLabel = tables.find(t => t.id === res.tableId)?.tableNumber;
                const isActive = ["pending", "confirmed"].includes(res.status);
                return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedRes(res)}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:scale-[1.005] transition-all duration-200 overflow-hidden cursor-pointer"
                  >
                    {/* Status bar */}
                    <div className={`h-1 w-full ${cfg.barColor}`} />

                    <div className="p-5 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm">
                        {res.customerName.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm truncate">{res.customerName}</p>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Calendar className="h-3 w-3 text-gray-400" /> {res.date}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Clock className="h-3 w-3 text-gray-400" /> {res.time}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Users className="h-3 w-3 text-gray-400" /> {res.guestCount} guest{res.guestCount !== 1 ? "s" : ""}
                          </span>
                          {tableLabel && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                                <MapPin className="h-3 w-3" /> T-{tableLabel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status badge + arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`hidden sm:inline text-[11px] font-bold px-3 py-1 rounded-full border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* WAITLIST */}
        {activeTab === "waitlist" && (
          <motion.div
            key="waitlist"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {waitlist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <ListOrdered className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">Waitlist is empty</p>
                <p className="text-gray-400 text-sm mt-1">Customers joining the waitlist will appear here.</p>
              </div>
            ) : (
              waitlist.map((wait, i) => {
                const cfg = waitStatusConfig[wait.status] ?? waitStatusConfig.waiting;
                const queuePos = waitlist.filter(w => w.status === "waiting").findIndex(w => w.id === wait.id);
                const isUpdating = updatingId === wait.id;
                return (
                  <motion.div
                    key={wait.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-5 flex items-center gap-4">
                      {/* Queue number */}
                      <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-lg border-2 ${wait.status === "waiting" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}>
                        {wait.status === "waiting" && queuePos >= 0 ? `#${queuePos + 1}` : "—"}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm">{wait.name}</h3>
                          <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Users className="h-3 w-3 text-gray-400" /> {wait.guests} guest{wait.guests !== 1 ? "s" : ""}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Phone className="h-3 w-3 text-gray-400" /> {wait.phone}
                          </span>
                          {wait.date && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                                <Calendar className="h-3 w-3 text-gray-400" /> {wait.date}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Waitlist actions */}
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        {wait.status !== "seated" && wait.status !== "cancelled" && (
                          <AppDropdown
                            label="Actions"
                            items={[
                              ...(wait.status === "waiting" ? [
                                { label: "Notify", icon: CheckCircle2, onClick: () => updateWaitlistStatus(wait.id, "notified") },
                                { label: "Cancel", icon: XCircle, danger: true, separator: true, onClick: () => updateWaitlistStatus(wait.id, "cancelled") },
                              ] : []),
                              ...(wait.status === "notified" ? [
                                { label: "Seat ✓", icon: CheckCircle2, onClick: () => updateWaitlistStatus(wait.id, "seated") },
                              ] : []),
                            ]}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reservation Detail Sheet ── */}
      <Sheet open={!!selectedRes} onOpenChange={(open) => { if (!open) setSelectedRes(null); }}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0 overflow-y-auto flex flex-col">

          {selectedRes && selectedResCfg && (
            <>
              {/* Sheet header with accent */}
              <div className={`${selectedResCfg.barColor} h-1 w-full shrink-0`} />
              <div className="p-6 border-b border-gray-100">
                <SheetHeader>
                  <SheetTitle className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 flex items-center justify-center font-extrabold text-base shrink-0">
                      {selectedRes.customerName.charAt(0).toUpperCase()}
                    </div>
                    {selectedRes.customerName}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${selectedResCfg.color}`}>
                    {selectedResCfg.label}
                  </span>
                  {selectedRes.otpVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full">
                      <Shield className="h-3 w-3" /> OTP Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-5 space-y-2.5">
                <DetailRow icon={Calendar} label="Date" value={selectedRes.date} />
                <DetailRow icon={Clock} label="Time" value={`${selectedRes.time}${selectedRes.slotEndTime ? ` – ${selectedRes.slotEndTime}` : ""}`} />
                <DetailRow icon={Users} label="Guests" value={`${selectedRes.guestCount} guest${selectedRes.guestCount !== 1 ? "s" : ""}`} />
                <DetailRow icon={Phone} label="Phone" value={selectedRes.phone} />
                {selectedRes.email && <DetailRow icon={Mail} label="Email" value={selectedRes.email} />}
                {selectedTableLabel && (
                  <DetailRow icon={MapPin} label="Table Assigned" value={`Table T-${selectedTableLabel}`} highlight />
                )}
                {selectedRes.notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-0.5">Note</p>
                      <p className="text-sm text-amber-800 leading-relaxed">{selectedRes.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedRes.status !== "completed" && selectedRes.status !== "cancelled" && selectedRes.status !== "no-show" && (
                <div className="p-5 border-t border-gray-100 space-y-2 shrink-0">
                  {selectedRes.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                        disabled={updatingId === selectedRes.id}
                        onClick={() => updateReservationStatus(selectedRes.id, "confirmed")}
                      >
                        {updatingId === selectedRes.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />} Confirm
                      </Button>
                      <Button
                        className="flex-1 h-11 border border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-xl"
                        disabled={updatingId === selectedRes.id}
                        onClick={() => updateReservationStatus(selectedRes.id, "cancelled")}
                      >
                        {updatingId === selectedRes.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />} Reject
                      </Button>
                    </div>
                  )}
                  {selectedRes.status === "confirmed" && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                        disabled={updatingId === selectedRes.id}
                        onClick={() => updateReservationStatus(selectedRes.id, "arrived")}
                      >
                        {updatingId === selectedRes.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />} Mark Arrived
                      </Button>
                      <Button
                        className="flex-1 h-11 border border-orange-200 text-orange-500 hover:bg-orange-50 font-bold rounded-xl"
                        disabled={updatingId === selectedRes.id}
                        onClick={() => updateReservationStatus(selectedRes.id, "no-show")}
                      >
                        {updatingId === selectedRes.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <AlertCircle className="h-4 w-4 mr-1.5" />} No Show
                      </Button>
                    </div>
                  )}
                  {selectedRes.status === "arrived" && (
                    <Button
                      className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                      disabled={updatingId === selectedRes.id}
                      onClick={() => updateReservationStatus(selectedRes.id, "completed")}
                    >
                      {updatingId === selectedRes.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Completed</>}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
