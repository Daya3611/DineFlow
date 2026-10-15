"use client";

import React, { useState, useMemo } from "react";
import { Order as OrderType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  Utensils,
  Plus,
  ArrowRight,
  Receipt,
  X,
  Loader2,
  Users,
  Printer,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionsViewProps {
  orders: OrderType[];
  restaurantId: string;
}

export function SessionsView({ orders, restaurantId }: SessionsViewProps) {
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newTableNum, setNewTableNum] = useState("");
  const [newGuestCount, setNewGuestCount] = useState("4");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Group dine-in orders into sessions
  const { activeSessions, completedSessions } = useMemo(() => {
    const map: {
      [key: string]: { sessionId: string; tableNumber: string; orders: OrderType[]; status: string };
    } = {};

    orders.forEach((o) => {
      if (o.type === "takeaway") return;
      const key = o.sessionId || `table_${o.tableNumber}`;
      if (!map[key]) {
        map[key] = {
          sessionId: o.sessionId || `sess_${o.tableNumber}`,
          tableNumber: o.tableNumber,
          orders: [],
          status: "active",
        };
      }
      map[key].orders.push(o);
    });

    const activeList: typeof map[string][] = [];
    const completedList: typeof map[string][] = [];

    Object.values(map).forEach((session) => {
      const isAllClosed = session.orders.every(
        (o) => o.status === "completed" || o.paymentStatus === "paid" || o.isActive === false
      );
      if (isAllClosed) {
        session.status = "paid";
        completedList.push(session);
      } else {
        activeList.push(session);
      }
    });

    return { activeSessions: activeList, completedSessions: completedList };
  }, [orders]);

  // Filter Active Sessions by status filter
  const filteredActiveSessions = useMemo(() => {
    return activeSessions.filter((sess) => {
      if (activeStatusFilter === "all") return true;
      if (activeStatusFilter === "new") return sess.orders.some((o) => o.status === "pending");
      if (activeStatusFilter === "preparing") return sess.orders.some((o) => o.status === "preparing");
      if (activeStatusFilter === "ready") return sess.orders.some((o) => o.status === "ready" || o.status === "served");
      return true;
    });
  }, [activeSessions, activeStatusFilter]);

  // Default active session selection
  const activeSessionData =
    activeSessions.find((s) => s.sessionId === selectedSessionId) ||
    filteredActiveSessions[0] ||
    activeSessions[0];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const formatAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  // Status updates per round
  const updateRoundStatus = async (orderId: string, newStatus: string) => {
    setLoadingId(orderId);
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: Date.now(),
      };
      if (newStatus === "completed" || newStatus === "paid") {
        updateData.paymentStatus = "paid";
        updateData.isActive = false;
      }
      await setDoc(doc(db, "orders", orderId), updateData, { merge: true });
      toast.success(`Round updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoadingId(null);
    }
  };

  // Session Settle & Checkout
  const handleSettleSession = async (sessionId: string, tableNumber: string) => {
    setLoadingId(sessionId);
    try {
      await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "closed" }),
      });

      const sessionOrders = activeSessionData?.orders || [];
      await Promise.all(
        sessionOrders.map((o) =>
          setDoc(
            doc(db, "orders", o.id),
            { status: "completed", paymentStatus: "paid", isActive: false },
            { merge: true }
          )
        )
      );

      toast.success(`Table ${tableNumber} bill settled and session closed!`);
      setSelectedSessionId(null);
    } catch {
      toast.error("Failed to settle session");
    } finally {
      setLoadingId(null);
    }
  };

  // Create new active session
  const handleCreateNewSession = async () => {
    if (!newTableNum) {
      toast.error("Please enter a table number");
      return;
    }
    setLoadingId("new_session");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: newTableNum.trim(),
          guestCount: newGuestCount,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to create session");

      toast.success(`Active session created for Table ${newTableNum}`);
      setShowNewSessionModal(false);
      setNewTableNum("");
      setSelectedSessionId(data.session.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create session");
    } finally {
      setLoadingId(null);
    }
  };

  // Status counts
  const newCount = activeSessions.filter((s) => s.orders.some((o) => o.status === "pending")).length;
  const preparingCount = activeSessions.filter((s) => s.orders.some((o) => o.status === "preparing")).length;
  const readyCount = activeSessions.filter((s) => s.orders.some((o) => o.status === "ready" || o.status === "served")).length;

  return (
    <div className="space-y-4">
      {/* Filter Bar Row matching reference screenshot #3 EXACTLY */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeStatusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setActiveStatusFilter("new")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeStatusFilter === "new"
                ? "bg-[#16A34A] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            New ({newCount})
          </button>
          <button
            onClick={() => setActiveStatusFilter("preparing")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeStatusFilter === "preparing"
                ? "bg-[#16A34A] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            Preparing ({preparingCount})
          </button>
          <button
            onClick={() => setActiveStatusFilter("ready")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeStatusFilter === "ready"
                ? "bg-[#16A34A] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            Ready ({readyCount})
          </button>
        </div>

        <Button
          onClick={() => setShowNewSessionModal(true)}
          className="h-9 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Main Grid: Active Session Cards (Left Column) & Session Details (Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left Column: Session Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {filteredActiveSessions.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-slate-200 p-12 text-center bg-white">
              <Utensils className="h-9 w-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No active sessions match filter</p>
              <p className="text-xs text-slate-400 mt-1">
                Scan table QR or click "+ New Order" to start a session.
              </p>
            </Card>
          ) : (
            filteredActiveSessions.map((sess) => {
              const earliestTs = Math.min(...sess.orders.map((o) => o.createdAt));
              const runningTotal = sess.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
              const isSelected = sess.sessionId === activeSessionData?.sessionId;
              const sessIdShort = `#S-${sess.sessionId.slice(-4).toUpperCase()}`;

              const hasNewOrder = sess.orders.some((o) => o.status === "pending");

              const sortedRounds = [...sess.orders].sort(
                (a, b) => (b.roundNumber || 0) - (a.roundNumber || 0)
              );

              return (
                <Card
                  key={sess.sessionId}
                  onClick={() => setSelectedSessionId(sess.sessionId)}
                  className={`rounded-2xl transition-all cursor-pointer overflow-hidden border ${hasNewOrder
                      ? "border-2 border-[#16A34A] shadow-xs bg-white"
                      : isSelected
                        ? "border-[#16A34A] ring-1 ring-[#16A34A] shadow-xs bg-white"
                        : "border-slate-200/90 hover:border-slate-300 bg-white"
                    }`}
                >
                  {/* Session Header matching reference screenshot */}
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${hasNewOrder
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                          }`}
                      >
                        T{sess.tableNumber}
                      </div>

                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          Session {sessIdShort}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatTime(earliestTs)} ({formatAgo(earliestTs)}) • 4 Guests
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                        RUNNING TOTAL
                      </span>
                      <span className="text-base font-black text-slate-900">
                        ₹{runningTotal.toLocaleString()}
                      </span>
                      <div className="pt-0.5">
                        {hasNewOrder ? (
                          <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            NEW ORDER
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-[#16A34A] px-2 py-0.5 rounded-md uppercase tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rounds List inside Session Card */}
                  <div className="p-4 space-y-3">
                    {sortedRounds.map((order, idx) => {
                      const roundNum = order.roundNumber || sortedRounds.length - idx;
                      const roundTotal = (order.items || []).reduce(
                        (s, i) => s + i.price * i.quantity,
                        0
                      );
                      const itemsPreviewStr = order.items
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ");

                      const isNew = order.status === "pending";
                      const isPreparing = order.status === "preparing";

                      return (
                        <div
                          key={order.id}
                          className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                Round {roundNum}
                              </span>
                              {isNew ? (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase">
                                  NEW
                                </span>
                              ) : isPreparing ? (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 uppercase">
                                  PREPARING
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                                  SERVED
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-extrabold text-slate-900">
                              ₹{roundTotal.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                            <span className="truncate max-w-[280px]">
                              {itemsPreviewStr}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {order.items.length} {order.items.length === 1 ? "Item" : "Items"}
                            </span>
                          </div>

                          {/* Action Buttons matching screenshot */}
                          <div className="pt-1.5 flex items-center justify-end gap-2 border-t border-slate-200/50">
                            {isNew && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateRoundStatus(order.id, "cancelled");
                                  }}
                                  className="h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold px-3"
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateRoundStatus(order.id, "preparing");
                                  }}
                                  disabled={loadingId === order.id}
                                  className="h-7 text-[11px] bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg font-bold px-3 shadow-xs"
                                >
                                  Accept & Prepare
                                </Button>
                              </>
                            )}

                            {isPreparing && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRoundStatus(order.id, "served");
                                }}
                                disabled={loadingId === order.id}
                                className="h-7 text-[11px] bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg font-bold px-3 shadow-xs"
                              >
                                Mark Ready
                              </Button>
                            )}

                            {!isNew && !isPreparing && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSessionId(sess.sessionId);
                                }}
                                className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold px-3"
                              >
                                Details
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          )}

          {/* Completed Sessions Today */}
          {completedSessions.length > 0 && (
            <div className="pt-4 space-y-3">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                COMPLETED SESSIONS (TODAY)
              </h3>
              <div className="space-y-2">
                {completedSessions.slice(0, 5).map((sess) => {
                  const total = sess.orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
                  const earliestTs = Math.min(...sess.orders.map((o) => o.createdAt));
                  const latestTs = Math.max(...sess.orders.map((o) => o.createdAt));

                  return (
                    <div
                      key={sess.sessionId}
                      className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          T{sess.tableNumber}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800">
                            Session #S-{sess.sessionId.slice(-4).toUpperCase()}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {formatTime(earliestTs)} - {formatTime(latestTs)} • ₹
                            {total.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                        PAID
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Session Details Drawer matching screenshot #3 EXACTLY */}
        <div className="lg:col-span-5">
          {activeSessionData ? (
            <Card className="rounded-2xl border-slate-200/90 bg-white shadow-xs overflow-hidden h-full flex flex-col justify-between sticky top-6">
              <CardHeader className="p-5 pb-4 border-b border-slate-100 space-y-0">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      TABLE {activeSessionData.tableNumber}
                    </span>
                    <CardTitle className="text-xl font-extrabold text-slate-900 mt-0.5">
                      Session #S-{activeSessionData.sessionId.slice(-4).toUpperCase()}
                    </CardTitle>
                  </div>
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Time Elapsed & Status Cards */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      TIME ELAPSED
                    </span>
                    <span className="font-extrabold text-slate-900 text-base mt-0.5 block">
                      {formatAgo(
                        Math.min(...activeSessionData.orders.map((o) => o.createdAt))
                      )}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      STATUS
                    </span>
                    <span className="font-extrabold text-[#16A34A] text-base mt-0.5 block">
                      Active
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-6">
                {/* Round-by-Round Breakdown matching screenshot */}
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {activeSessionData.orders
                    .sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0))
                    .map((order, idx) => {
                      const roundNum = order.roundNumber || activeSessionData.orders.length - idx;
                      const roundTotal = (order.items || []).reduce(
                        (s, i) => s + i.price * i.quantity,
                        0
                      );

                      const isPreparing = order.status === "preparing";

                      return (
                        <div key={order.id} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">
                                Round {roundNum}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {formatTime(order.createdAt)}
                              </span>
                            </div>
                            {isPreparing ? (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 uppercase">
                                PREPARING
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                                SERVED
                              </span>
                            )}
                          </div>

                          {/* Items list */}
                          <div className="space-y-1.5 text-xs text-slate-800">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center">
                                <span className="font-semibold text-slate-900">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-bold text-slate-900">
                                  ₹{item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-semibold">Round Total</span>
                            <span className="font-extrabold text-slate-900">
                              ₹{roundTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Subtotal, Taxes, Grand Total & Actions */}
                {(() => {
                  const rawSubtotal = activeSessionData.orders.reduce(
                    (s, o) => s + (o.totalAmount || 0),
                    0
                  );
                  const tax = Math.round(rawSubtotal * 0.05 * 100) / 100;
                  const grandTotal = rawSubtotal + tax;

                  return (
                    <div className="pt-4 border-t border-slate-100 space-y-4 shrink-0 bg-white">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Subtotal</span>
                          <span className="font-bold text-slate-900">
                            ₹{rawSubtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Taxes (5%)</span>
                          <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                          <span className="text-sm font-extrabold text-slate-900">
                            Grand Total
                          </span>
                          <span className="text-2xl font-black text-slate-900">
                            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button
                          variant="outline"
                          onClick={() => window.print()}
                          className="h-11 rounded-xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5 cursor-pointer"
                        >
                          <Printer className="h-4 w-4" /> Print Bill
                        </Button>
                        <Button
                          onClick={() =>
                            handleSettleSession(
                              activeSessionData.sessionId,
                              activeSessionData.tableNumber
                            )
                          }
                          disabled={loadingId === activeSessionData.sessionId}
                          className="h-11 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                        >
                          {loadingId === activeSessionData.sessionId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                          Settle Bill
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-dashed border-slate-200 p-12 text-center bg-white h-full flex flex-col items-center justify-center">
              <Utensils className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-800">No Session Selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select an active dining session from the left to view round breakdowns and settle bill.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      <Dialog open={showNewSessionModal} onOpenChange={setShowNewSessionModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Start New Dining Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Table Number
              </label>
              <input
                type="text"
                placeholder="e.g. 5, 12, T-01"
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Guest Count
              </label>
              <input
                type="number"
                value={newGuestCount}
                onChange={(e) => setNewGuestCount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <Button
              onClick={handleCreateNewSession}
              disabled={loadingId === "new_session"}
              className="w-full h-11 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm shadow-xs mt-2"
            >
              {loadingId === "new_session" ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Create Active Session"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
