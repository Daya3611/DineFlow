"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Reservation, Waitlist } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import {
  Loader2, Calendar, Clock, User, Phone, MapPin,
  AlertCircle, CheckCircle2, XCircle, Users, ListOrdered
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";

const statusConfig: Record<string, { label: string; color: string; barColor: string }> = {
  pending:   { label: "Pending",   color: "bg-yellow-50 text-yellow-700 border-yellow-200",   barColor: "bg-yellow-400" },
  confirmed: { label: "Confirmed", color: "bg-green-50 text-green-700 border-green-200",     barColor: "bg-green-500"  },
  arrived:   { label: "Arrived",   color: "bg-blue-50 text-blue-700 border-blue-200",        barColor: "bg-blue-500"   },
  completed: { label: "Completed", color: "bg-gray-50 text-gray-500 border-gray-200",        barColor: "bg-gray-300"   },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200",           barColor: "bg-red-400"    },
  "no-show": { label: "No Show",   color: "bg-orange-50 text-orange-600 border-orange-200",  barColor: "bg-orange-400" },
};

const waitStatusConfig: Record<string, { label: string; color: string }> = {
  waiting:   { label: "Waiting",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  notified:  { label: "Notified", color: "bg-blue-50 text-blue-700 border-blue-200"       },
  seated:    { label: "Seated",   color: "bg-green-50 text-green-700 border-green-200"    },
  cancelled: { label: "Cancelled",color: "bg-red-50 text-red-600 border-red-200"          },
};

export default function ReservationsPage() {
  const { restaurant } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reservations" | "waitlist">("reservations");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resSnap, waitSnap, tSnap] = await Promise.all([
          getDocs(query(collection(db, "reservations"), where("restaurantId", "==", restaurant.id))),
          getDocs(query(collection(db, "waitlist"), where("restaurantId", "==", restaurant.id))),
          getDocs(query(collection(db, "tables"), where("restaurantId", "==", restaurant.id))),
        ]);
        setReservations(resSnap.docs.map(d => d.data() as Reservation).sort((a, b) => b.createdAt - a.createdAt));
        setWaitlist(waitSnap.docs.map(d => d.data() as Waitlist).sort((a, b) => b.time - a.time));
        setTables(tSnap.docs.map(d => d.data()));
      } catch { toast.error("Failed to load data."); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [restaurant]);

  const updateReservationStatus = async (id: string, status: Reservation["status"]) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "reservations", id), { status });
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(`Marked as ${status}`);
    } catch { toast.error("Failed to update"); }
    finally { setUpdatingId(null); }
  };

  const updateWaitlistStatus = async (id: string, status: Waitlist["status"]) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "waitlist", id), { status });
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status } : w));
      toast.success(`Marked as ${status}`);
    } catch { toast.error("Failed to update"); }
    finally { setUpdatingId(null); }
  };

  const activeResCount = reservations.filter(r => ["pending", "confirmed"].includes(r.status)).length;
  const activeWaitCount = waitlist.filter(w => w.status === "waiting").length;

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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Bookings & Waitlist</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage table reservations and walk-in queue.</p>
        </div>
        {/* Quick stats */}
        <div className="flex gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-extrabold text-green-700">{activeResCount}</div>
            <div className="text-xs text-green-600 font-semibold">Active</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-extrabold text-amber-700">{activeWaitCount}</div>
            <div className="text-xs text-amber-600 font-semibold">Waiting</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["reservations", "waitlist"] as const).map(tab => (
          <Button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab
                ? "bg-white text-green-700 shadow-sm shadow-gray-200/80"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "reservations"
              ? <><Calendar className="h-4 w-4" /> Reservations <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{activeResCount}</span></>
              : <><ListOrdered className="h-4 w-4" /> Waitlist <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-500"}`}>{activeWaitCount}</span></>
            }
          </Button>
        ))}
      </div>

      {/* ── Reservations Tab ── */}
      <AnimatePresence mode="wait">
        {activeTab === "reservations" && (
          <motion.div
            key="reservations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">No reservations yet</p>
                <p className="text-gray-400 text-sm mt-1">Bookings will appear here when customers make reservations.</p>
              </div>
            ) : (
              reservations.map((res, i) => {
                const cfg = statusConfig[res.status] ?? statusConfig.pending;
                const tableLabel = tables.find(t => t.id === res.tableId)?.tableNumber;
                const isUpdating = updatingId === res.id;
                return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

                      {/* Top accent bar */}
                      <div className={`h-1 w-full ${cfg.barColor}`} />

                      <div className="p-5 flex flex-col gap-4">

                        {/* Header: Avatar + Name + Status badge */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-base shrink-0">
                              {res.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm leading-tight truncate">{res.customerName}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(res.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600">
                            <Calendar className="h-3 w-3 text-gray-400" /> {res.date}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600">
                            <Clock className="h-3 w-3 text-gray-400" /> {res.time}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600">
                            <Users className="h-3 w-3 text-gray-400" /> {res.guestCount} Guest{res.guestCount !== 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600">
                            <Phone className="h-3 w-3 text-gray-400" /> {res.phone}
                          </span>
                          {tableLabel && (
                            <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-xs font-bold text-green-700">
                              <MapPin className="h-3 w-3 text-green-500" /> Table {tableLabel}
                            </span>
                          )}
                        </div>

                        {/* Note — subtle amber block */}
                        {res.notes && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-sm">
                            <span className="text-base shrink-0">📝</span>
                            <p className="text-amber-800 leading-snug">
                              <span className="font-semibold">Note: </span>{res.notes}
                            </p>
                          </div>
                        )}

                        {/* Action buttons — bottom right */}
                        {res.status !== "completed" && res.status !== "cancelled" && res.status !== "no-show" && (
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-50">
                            {res.status === "pending" && (
                              <>
                                <Button disabled={isUpdating} onClick={() => updateReservationStatus(res.id, "confirmed")}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                                </Button>
                                <Button disabled={isUpdating} onClick={() => updateReservationStatus(res.id, "cancelled")}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </Button>
                              </>
                            )}
                            {res.status === "confirmed" && (
                              <>
                                <Button disabled={isUpdating} onClick={() => updateReservationStatus(res.id, "arrived")}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Arrived
                                </Button>
                                <Button disabled={isUpdating} onClick={() => updateReservationStatus(res.id, "no-show")}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-200 text-orange-500 text-xs font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50"
                                >
                                  <AlertCircle className="h-3.5 w-3.5" /> No Show
                                </Button>
                              </>
                            )}
                            {res.status === "arrived" && (
                              <Button disabled={isUpdating} onClick={() => updateReservationStatus(res.id, "completed")}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                              </Button>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ── Waitlist Tab ── */}
        {activeTab === "waitlist" && (
          <motion.div
            key="waitlist"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Queue number */}
                          <div className={`shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-lg border-2 ${
                            wait.status === "waiting"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}>
                            {wait.status === "waiting" && queuePos >= 0 ? `#${queuePos + 1}` : "—"}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-base">{wait.name}</h3>
                              <Badge className={`capitalize text-xs font-semibold border px-3 py-1 rounded-full ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700">
                                <Users className="h-3.5 w-3.5 text-gray-400" /> {wait.guests} Guest{wait.guests !== 1 ? "s" : ""}
                              </div>
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700">
                                <Phone className="h-3.5 w-3.5 text-gray-400" /> {wait.phone}
                              </div>
                              {wait.date && (
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400" /> {wait.date}
                                </div>
                              )}
                              {wait.timeSlot && (
                                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-bold text-amber-700">
                                  <Clock className="h-3.5 w-3.5 text-amber-500" /> {wait.timeSlot}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-400">
                                <Clock className="h-3 w-3" /> {new Date(wait.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>

                          {/* Waitlist action dropdown */}
                          <div className="shrink-0">
                            {wait.status !== "seated" && wait.status !== "cancelled" && (
                              <AppDropdown
                                label="Actions"
                                items={[
                                  ...(wait.status === "waiting" ? [
                                    { label: "Notify",  icon: CheckCircle2, onClick: () => updateWaitlistStatus(wait.id, "notified") },
                                    { label: "Cancel",  icon: XCircle,      danger: true, separator: true, onClick: () => updateWaitlistStatus(wait.id, "cancelled") },
                                  ] : []),
                                  ...(wait.status === "notified" ? [
                                    { label: "Seat ✓", icon: CheckCircle2, onClick: () => updateWaitlistStatus(wait.id, "seated") },
                                  ] : []),
                                ]}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
