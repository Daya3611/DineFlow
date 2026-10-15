"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Reservation, Waitlist, Table as TableType } from "@/types";
import { bookingService } from "@/lib/services/bookingService";
import { waitlistService } from "@/lib/services/waitlistService";
import { tableService, LocationCapacityBreakdown } from "@/lib/services/tableService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon, Clock, Users, MapPin, Search, Filter,
  CheckCircle2, AlertCircle, XCircle, ChevronRight, ChevronLeft,
  UserPlus, Plus, RefreshCw, Sparkles, Utensils, MessageSquare,
  Gift, Heart, Info, MoreVertical, Phone, Mail, FileText, ArrowRight,
  ShieldCheck, Hourglass, Check, Loader2, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";
import { NewBookingModal } from "@/components/restaurant/bookings/NewBookingModal";
import { AddToWaitlistModal } from "@/components/restaurant/bookings/AddToWaitlistModal";
import { SeatGuestModal, TableOption } from "@/components/restaurant/bookings/SeatGuestModal";
import { NotifyGuestModal } from "@/components/restaurant/bookings/NotifyGuestModal";
import { FloorTimelineView } from "@/components/restaurant/bookings/FloorTimelineView";
import { ViewOrderModal } from "@/components/restaurant/bookings/ViewOrderModal";

export default function BookingsAndWaitlistPage() {
  const { restaurant } = useAuth();

  // Firestore DB States (Strictly database sourced)
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State (default to Today's date YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // UI Tab & Search & Filters
  const [activeTab, setActiveTab] = useState<"reservations" | "waitlist" | "timeline">("reservations");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableFilter, setSelectedTableFilter] = useState("all");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState("all");

  // Modals
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [seatModalData, setSeatModalData] = useState<{
    isOpen: boolean;
    guestName: string;
    partySize: number;
    resId?: string;
    waitId?: string;
    defaultTable?: string;
  }>({
    isOpen: false,
    guestName: "",
    partySize: 2,
  });
  const [notifyModalData, setNotifyModalData] = useState<{
    isOpen: boolean;
    guestName: string;
    phone: string;
    waitId?: string;
  }>({
    isOpen: false,
    guestName: "",
    phone: "",
  });
  const [orderModalData, setOrderModalData] = useState<{
    isOpen: boolean;
    guestName: string;
    tableName: string;
  }>({
    isOpen: false,
    guestName: "",
    tableName: "",
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Subscriptions to Cloud Firestore ──
  useEffect(() => {
    const targetId = restaurant?.id || (restaurant as any)?.restaurantId || "rest-1";
    setLoading(true);

    // 1. Subscribe to Reservations
    const unsubRes = bookingService.subscribeReservations(
      targetId,
      selectedDate,
      (data) => {
        setReservations(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    // 2. Subscribe to Waitlist
    const unsubWait = waitlistService.subscribeWaitlist(
      targetId,
      (data) => {
        setWaitlist(data);
      }
    );

    // 3. Subscribe to Tables
    const unsubTables = tableService.subscribeTables(
      targetId,
      (data) => {
        setTables(data);
      }
    );

    return () => {
      unsubRes();
      unsubWait();
      unsubTables();
    };
  }, [restaurant, selectedDate]);

  // Run Table Ready Matching when tables or waitlist change
  useEffect(() => {
    if (waitlist.length > 0 && tables.length > 0) {
      waitlistService.matchTableReadyParties(waitlist, tables);
    }
  }, [waitlist, tables]);

  // Manual refresh trigger
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Refreshed with live database!");
    }, 500);
  };

  // ── Database Mutation Handlers ──

  // Create New Booking
  const handleSaveBooking = async (newBooking: Partial<Reservation>) => {
    const targetId = restaurant?.id || "rest-1";

    // Validate table availability overlap
    if (newBooking.tableId && newBooking.tableId !== "auto") {
      const isOverlapping = bookingService.checkTableOverlap(
        reservations,
        newBooking.tableId,
        newBooking.date || selectedDate,
        newBooking.time || "12:00"
      );
      if (isOverlapping) {
        toast.error("Table already booked for this time slot! Select a different table or auto-assign.");
        return;
      }
    }

    try {
      await bookingService.createBooking({
        ...newBooking,
        restaurantId: targetId,
        date: newBooking.date || selectedDate,
      });
      toast.success(`Booking created for ${newBooking.customerName || "Guest"}!`);
    } catch (err: any) {
      toast.error("Failed to create booking in database.");
    }
  };

  // Add Walk-in Party to Waitlist
  const handleSaveWaitlist = async (newEntry: Partial<Waitlist>) => {
    const targetId = restaurant?.id || "rest-1";
    try {
      await waitlistService.createWaitlistEntry({
        ...newEntry,
        restaurantId: targetId,
      });
      toast.success(`Queued ${newEntry.name || "Guest"} (${newEntry.guests || 2} guests) in DB!`);
    } catch (err: any) {
      toast.error("Failed to add waitlist entry.");
    }
  };

  // Confirm Seating a Guest
  const handleConfirmSeatGuest = async (tableId: string, tableName: string) => {
    try {
      if (seatModalData.resId) {
        await bookingService.updateStatus(seatModalData.resId, "seated_now", {
          tableId,
          tableName,
        });
        await tableService.updateTableStatus(tableId, "occupied");
        toast.success(`${seatModalData.guestName} seated at ${tableName}!`);
      } else if (seatModalData.waitId) {
        await waitlistService.updateStatus(seatModalData.waitId, "seated");
        await tableService.updateTableStatus(tableId, "occupied");

        // Also create a seated reservation entry in DB
        const targetId = restaurant?.id || "rest-1";
        await bookingService.createBooking({
          restaurantId: targetId,
          customerName: seatModalData.guestName,
          phone: "+91 98000 00000",
          date: selectedDate,
          time: "13:00",
          guestCount: seatModalData.partySize,
          status: "seated_now",
          tableId,
          tableName,
        });
        toast.success(`${seatModalData.guestName} seated from waitlist at ${tableName}!`);
      }
    } catch (err: any) {
      toast.error("Failed to update seating state.");
    }
  };

  // Complete Booking
  const handleCompleteBooking = async (resId: string, tableId?: string) => {
    try {
      await bookingService.updateStatus(resId, "completed");
      if (tableId) {
        await tableService.updateTableStatus(tableId, "free");
      }
      toast.success("Booking completed and table freed.");
    } catch (err: any) {
      toast.error("Failed to complete booking.");
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (resId: string, tableId?: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await bookingService.updateStatus(resId, "cancelled", {
        cancellationReason: "Cancelled by restaurant staff",
        systemAction: tableId ? "Table released" : undefined,
      });
      if (tableId) {
        await tableService.updateTableStatus(tableId, "free");
      }
      toast.info("Booking cancelled and table released.");
    } catch (err: any) {
      toast.error("Failed to cancel booking.");
    }
  };

  // Remove Waitlist Entry
  const handleRemoveWaitlist = async (id: string, name: string) => {
    try {
      await waitlistService.updateStatus(id, "cancelled");
      toast.info(`Removed ${name} from waitlist.`);
    } catch (err: any) {
      toast.error("Failed to update waitlist.");
    }
  };

  // Rebook Reservation
  const handleRebook = async (res: Reservation) => {
    try {
      await bookingService.updateStatus(res.id, "confirmed", {
        countdown: "In 2h 00m",
      });
      toast.success(`Rebooked reservation for ${res.customerName}!`);
    } catch (err: any) {
      toast.error("Failed to rebook.");
    }
  };

  // ── Real-time Search & Filter Querying ──
  const filteredReservations = reservations.filter((r) => {
    if (statusFilter === "upcoming" && r.status !== "confirmed") return false;
    if (statusFilter === "seated" && (r.status !== "seated_now" && r.status !== "seated")) return false;
    if (statusFilter === "completed" && r.status !== "completed") return false;
    if (statusFilter === "cancelled" && r.status !== "cancelled") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.customerName || "").toLowerCase().includes(q);
      const matchPhone = (r.phone || "").toLowerCase().includes(q);
      const matchEmail = (r.email || "").toLowerCase().includes(q);
      const matchTable = (r.tableName || "").toLowerCase().includes(q);
      const matchId = (r.id || "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail && !matchTable && !matchId) return false;
    }

    if (selectedTableFilter !== "all") {
      if (!r.tableName?.includes(selectedTableFilter)) return false;
    }

    if (selectedPartyFilter !== "all") {
      const p = Number(selectedPartyFilter);
      if (r.guestCount !== p) return false;
    }

    return true;
  });

  const activeWaitlist = waitlist.filter((w) => ["waiting", "table_ready"].includes(w.status));

  // Dynamic KPI Calculations from Real DB Data
  const confirmedKpi = bookingService.calculateConfirmedTodayKpi(reservations);
  const seatedKpi = bookingService.calculateSeatedActiveKpi(reservations, tables);
  const upcomingKpi = bookingService.calculateUpcomingNext2HKpi(reservations);
  const waitlistKpi = waitlistService.calculateWaitlistKpi(waitlist, tables);
  const capacityBreakdown = tableService.calculateLocationCapacity(tables);
  const overallOccupancy = tableService.calculateOverallOccupancy(tables);

  const isFilterActive = searchQuery.trim() !== "" || selectedTableFilter !== "all" || selectedPartyFilter !== "all" || statusFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTableFilter("all");
    setSelectedPartyFilter("all");
    setStatusFilter("all");
  };

  // Convert DB tables to TableOption format for modals
  const dbTableOptions: TableOption[] = tables.map((t) => ({
    id: t.id,
    tableNumber: t.tableNumber,
    capacity: t.capacity || 4,
    location: (t.location as any) || (t.tableNumber.startsWith("P") ? "Private Dining" : "Indoor AC"),
    status: (t.status as any) || "free",
  }));

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#008A45]" />
          <p className="text-sm font-semibold text-slate-500">Loading bookings & waitlist from DB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      {/* ── TOP PAGE HEADER & ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
              Bookings & Waitlist
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#008A45] border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-[#008A45] animate-pulse" /> LIVE SERVICE
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage table reservations, guest schedules, and real-time walk-in queues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-[#008A45]" />
            <span>{seatedKpi.totalGuests} Active ({seatedKpi.activeTablesCount} Tables)</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-200/80 px-3.5 py-2 rounded-xl text-xs font-bold text-pink-800">
            <Hourglass className="h-4 w-4 text-pink-600" />
            <span>{waitlistKpi.waitingCount} Waiting (~{waitlistKpi.estimatedWaitText})</span>
          </div>

          {/* Date Selector */}
          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setIsWaitlistOpen(true)}
            className="rounded-xl h-10 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs gap-1.5"
          >
            <UserPlus className="h-4 w-4 text-pink-600" /> + Add to Waitlist
          </Button>

          <Button
            onClick={() => setIsNewBookingOpen(true)}
            className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-4 text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> + New Booking
          </Button>
        </div>
      </div>

      {/* ── DYNAMIC KPI SUMMARY CARDS (Calculated from Real DB) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: CONFIRMED TODAY */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                CONFIRMED TODAY
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#008A45] flex items-center justify-center font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {confirmedKpi.totalGuests}
              </span>
              <span className="text-sm font-semibold text-slate-500">guests</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {confirmedKpi.totalBookings} Bookings
            </span>
            <span className="text-slate-500 font-medium">
              {confirmedKpi.totalBookings > 0 ? `${confirmedKpi.tablesAllocatedPercentage}% tables allocated` : "No bookings"}
            </span>
          </div>
        </div>

        {/* CARD 2: SEATED / ACTIVE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                SEATED / ACTIVE
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Utensils className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {seatedKpi.totalGuests}
              </span>
              <span className="text-sm font-semibold text-slate-500">guests</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {seatedKpi.activeTablesCount} Tables Active
            </span>
            <span className="text-slate-500 font-medium">
              {seatedKpi.avgTurnTimeMinutes ? `Avg turn ${seatedKpi.avgTurnTimeMinutes}m` : "Not enough data"}
            </span>
          </div>
        </div>

        {/* CARD 3: UPCOMING (NEXT 2H) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                UPCOMING (NEXT 2H)
              </span>
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {upcomingKpi.partiesCount}
              </span>
              <span className="text-sm font-semibold text-slate-500">parties</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              {upcomingKpi.totalGuests} Guests
            </span>
            <span className="text-slate-500 font-medium truncate max-w-[120px]">
              {upcomingKpi.nextReservationText || "No upcoming reservations"}
            </span>
          </div>
        </div>

        {/* CARD 4: WAITLIST QUEUE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                WAITLIST QUEUE
              </span>
              <div className="h-9 w-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                <Hourglass className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {waitlistKpi.waitingCount}
              </span>
              <span className="text-sm font-semibold text-slate-500">waiting</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-pink-800 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
              Est. {waitlistKpi.estimatedWaitText}
            </span>
            <span className="text-slate-500 font-medium">
              {waitlistKpi.releasingTablesCount} tables releasing
            </span>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION & STATUS FILTERS ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab("reservations")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "reservations"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="h-4 w-4 text-[#008A45]" />
              Reservations
              <span className="ml-1 bg-emerald-100 text-[#008A45] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {reservations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("waitlist")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "waitlist"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4 text-pink-600" />
              Waitlist Queue
              <span className="ml-1 bg-pink-100 text-pink-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {activeWaitlist.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "timeline"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-4 w-4 text-purple-600" />
              Floor Timeline
            </button>
          </div>

          {/* Dynamic Status Filters */}
          {activeTab === "reservations" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All", count: reservations.length },
                { id: "upcoming", label: "Upcoming", count: reservations.filter((r) => r.status === "confirmed").length },
                { id: "seated", label: "Seated", count: reservations.filter((r) => r.status === "seated_now" || r.status === "seated").length },
                { id: "completed", label: "Completed", count: reservations.filter((r) => r.status === "completed").length },
                { id: "cancelled", label: "Cancelled", count: reservations.filter((r) => r.status === "cancelled").length },
              ].map((f) => {
                const isActive = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isActive
                        ? "bg-[#008A45] text-white border-[#008A45] shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search + Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search guest name, phone (+91), booking ID, or table (T-4)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-slate-200 text-xs text-slate-800 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedTableFilter} onValueChange={(val) => setSelectedTableFilter(val || "all")}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-xs font-semibold text-slate-700 min-w-[130px]">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.tableNumber}>
                    Table {t.tableNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPartyFilter} onValueChange={(val) => setSelectedPartyFilter(val || "all")}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-xs font-semibold text-slate-700 min-w-[120px]">
                <SelectValue placeholder="Party Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Party Size (Any)</SelectItem>
                <SelectItem value="2">2 Guests</SelectItem>
                <SelectItem value="3">3 Guests</SelectItem>
                <SelectItem value="4">4 Guests</SelectItem>
                <SelectItem value="6">6+ Guests</SelectItem>
              </SelectContent>
            </Select>

            {isFilterActive && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="h-11 text-xs text-slate-500 hover:text-slate-800 font-semibold gap-1"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOOR TIMELINE TAB COMPONENT ── */}
      {activeTab === "timeline" ? (
        <FloorTimelineView
          reservations={reservations}
          onSelectReservation={(res) => {
            if (res.status === "seated_now" || res.status === "seated") {
              setOrderModalData({ isOpen: true, guestName: res.customerName, tableName: res.tableName || "Table T-4" });
            } else if (res.status === "confirmed") {
              setSeatModalData({ isOpen: true, guestName: res.customerName, partySize: res.guestCount, resId: res.id });
            }
          }}
        />
      ) : (
        /* ── MAIN CONTENT (70% Left Column / 30% Right Column) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (70% width) ── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Today&apos;s Schedule ({filteredReservations.length} Reservations)
                </h3>
              </div>

              <button
                onClick={handleRefresh}
                className="text-xs font-semibold text-slate-500 hover:text-[#008A45] flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#008A45]" : ""}`} />
                Updated just now
              </button>
            </div>

            {/* RESERVATIONS CARDS LIST */}
            {filteredReservations.length === 0 ? (
              /* Authentic Empty State */
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-[#008A45] flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="h-7 w-7" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1">
                  {searchQuery.trim() ? "No matching bookings found" : "No reservations for this date"}
                </h4>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mb-5">
                  {searchQuery.trim()
                    ? "Try adjusting your search keywords or clearing active status filters."
                    : "There are no guest bookings recorded in the database for the selected date."}
                </p>
                <Button
                  onClick={() => setIsNewBookingOpen(true)}
                  className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-5 text-xs shadow-2xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create a Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredReservations.map((res) => {
                  const isSeated = res.status === "seated_now" || res.status === "seated";
                  const isConfirmed = res.status === "confirmed";
                  const isCompleted = res.status === "completed";
                  const isCancelled = res.status === "cancelled";

                  return (
                    <div
                      key={res.id}
                      className={`
                        bg-white rounded-2xl p-5 border transition-all duration-200 relative shadow-2xs hover:shadow-xs
                        ${
                          isSeated
                            ? "border-emerald-200 bg-emerald-50/20"
                            : isConfirmed
                            ? "border-slate-200 hover:border-slate-300"
                            : isCompleted
                            ? "border-slate-200 opacity-90"
                            : "border-pink-100 bg-pink-50/10"
                        }
                      `}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Left: Avatar & Guest details */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Avatar Badge */}
                          <div
                            className={`
                              h-11 w-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-2xs
                              ${
                                isSeated
                                  ? "bg-emerald-100 text-[#008A45]"
                                  : isConfirmed
                                  ? "bg-blue-100 text-blue-700"
                                  : isCompleted
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-pink-100 text-pink-700"
                              }
                            `}
                          >
                            {res.customerName.charAt(0).toUpperCase()}
                            {res.customerName.split(" ")[1]?.charAt(0).toUpperCase() || ""}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-base truncate">
                                {res.customerName}
                              </h4>

                              {res.isVipRegular && (
                                <span className="bg-emerald-100 text-[#008A45] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  VIP REGULAR
                                </span>
                              )}

                              {/* Status Pill */}
                              {isSeated && (
                                <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Seated Now
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  Confirmed
                                </span>
                              )}
                              {isCompleted && (
                                <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  Completed
                                </span>
                              )}
                              {isCancelled && (
                                <span className="bg-pink-100 text-pink-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  Cancelled
                                </span>
                              )}
                            </div>

                            {/* Contact */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              {res.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" /> {res.phone}
                                </span>
                              )}
                              {res.email && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Mail className="h-3 w-3 text-slate-400" /> {res.email}
                                </span>
                              )}
                            </div>

                            {/* Schedule info & Table tag */}
                            <div className="flex items-center gap-3.5 pt-1.5 text-xs flex-wrap">
                              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                <Clock className="h-3.5 w-3.5 text-slate-400" /> {res.time}
                              </span>

                              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                <Users className="h-3.5 w-3.5 text-slate-400" /> {res.guestCount} guests
                              </span>

                              {res.date && isConfirmed && (
                                <span className="text-slate-400 font-medium">
                                  {res.date}
                                </span>
                              )}

                              {res.countdown && (
                                <span className="text-[#008A45] font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                                  {res.countdown}
                                </span>
                              )}
                            </div>

                            {/* Table Tag or Unassigned */}
                            <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                              {res.tableName ? (
                                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-xl text-xs border border-blue-100">
                                  <MapPin className="h-3.5 w-3.5 text-blue-500" /> {res.tableName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-xs bg-amber-50 px-2.5 py-0.5 rounded-xl border border-amber-100">
                                  Table not assigned
                                </span>
                              )}

                              {res.billingText && (
                                <span className="inline-flex items-center gap-1 text-slate-600 font-bold text-xs bg-slate-100 px-3 py-1 rounded-xl">
                                  {res.billingText}
                                </span>
                              )}
                            </div>

                            {/* Special Request or Cancellation Note */}
                            {res.specialRequest && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1 rounded-xl border border-amber-100">
                                  <Gift className="h-3.5 w-3.5 text-amber-600" /> {res.specialRequest}
                                </span>
                              </div>
                            )}

                            {res.cancellationReason && (
                              <div className="pt-1 space-y-1">
                                <p className="text-xs text-pink-600 font-semibold flex items-center gap-1">
                                  <XCircle className="h-3.5 w-3.5" /> {res.cancellationReason}
                                </p>
                                {res.systemAction && (
                                  <span className="inline-block text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md font-medium">
                                    {res.systemAction}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                          {isSeated && (
                            <Button
                              variant="outline"
                              onClick={() => setOrderModalData({ isOpen: true, guestName: res.customerName, tableName: res.tableName || "Table T-4" })}
                              className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              View Table Order
                            </Button>
                          )}

                          {isConfirmed && (
                            <Button
                              onClick={() => setSeatModalData({ isOpen: true, guestName: res.customerName, partySize: res.guestCount, resId: res.id })}
                              className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold h-9 px-4 text-xs rounded-xl shadow-2xs"
                            >
                              Seat Guests
                            </Button>
                          )}

                          {isCompleted && (
                            <Button
                              variant="outline"
                              onClick={() => toast.info(`Printing Invoice Receipt for ${res.customerName}`)}
                              className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-600"
                            >
                              Invoice Receipt
                            </Button>
                          )}

                          {isCancelled && (
                            <Button
                              variant="outline"
                              onClick={() => handleRebook(res)}
                              className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              Rebook
                            </Button>
                          )}

                          <AppDropdown
                            items={[
                              { label: "View Guest Details", icon: FileText, onClick: () => toast.info(`Guest: ${res.customerName} (${res.phone})`) },
                              { label: "Reassign Table", icon: MapPin, onClick: () => setSeatModalData({ isOpen: true, guestName: res.customerName, partySize: res.guestCount, resId: res.id }) },
                              ...(!isCompleted && !isCancelled ? [{ label: "Mark Completed", icon: CheckCircle2, onClick: () => handleCompleteBooking(res.id, res.tableId) }] : []),
                              ...(!isCancelled ? [{ label: "Cancel Booking", icon: XCircle, danger: true, separator: true, onClick: () => handleCancelBooking(res.id, res.tableId) }] : []),
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (30% width) ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* WALK-IN WAITLIST PANEL */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">Walk-in Waitlist</h3>
                  <span className="bg-pink-100 text-pink-700 font-extrabold text-xs px-2 py-0.5 rounded-full">
                    {activeWaitlist.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsWaitlistOpen(true)}
                  className="text-xs font-extrabold text-[#008A45] hover:underline"
                >
                  + Add Party
                </button>
              </div>

              {/* WAITLIST ITEMS */}
              {activeWaitlist.length === 0 ? (
                /* Authentic Waitlist Empty State */
                <div className="py-10 px-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-700 mb-0.5">No guests waiting</p>
                  <p className="text-[11px] text-slate-400 mb-3">Queue walk-in parties when waitlist opens.</p>
                  <Button
                    onClick={() => setIsWaitlistOpen(true)}
                    className="h-8 px-3 text-xs bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-lg"
                  >
                    + Queue Walk-in
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeWaitlist.map((item, index) => {
                    const priority = `#${index + 1}`;
                    const isTableReady = item.status === "table_ready";

                    return (
                      <div
                        key={item.id}
                        className={`
                          rounded-xl p-4 border transition-all relative space-y-3
                          ${
                            isTableReady
                              ? "bg-emerald-50/70 border-emerald-300 shadow-2xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`
                                h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0
                                ${isTableReady ? "bg-[#008A45] text-white" : "bg-slate-100 text-slate-700"}
                              `}
                            >
                              {priority}
                            </span>

                            <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                          </div>

                          {isTableReady ? (
                            <span className="bg-[#008A45] text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                              TABLE READY!
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-semibold">
                                {item.estimatedWait}
                              </span>
                              <button
                                onClick={() => handleRemoveWaitlist(item.id, item.name)}
                                className="text-slate-300 hover:text-slate-500 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="h-3.5 w-3.5 text-slate-400" /> {item.guests} guests {item.partyTag ? `(${item.partyTag})` : ""}
                          </span>

                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-slate-400" /> {item.waitedTime}
                          </span>

                          {item.tableAvailability && (
                            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                              {item.tableAvailability}
                            </span>
                          )}

                          {item.preference && (
                            <span className="text-slate-400 text-[11px]">
                              {item.preference}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        {isTableReady ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              onClick={() => setSeatModalData({ isOpen: true, guestName: item.name, partySize: item.guests, waitId: item.id })}
                              className="flex-1 bg-[#008A45] hover:bg-[#00743a] text-white font-bold h-9 text-xs rounded-xl shadow-2xs"
                            >
                              Seat Guests
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setNotifyModalData({ isOpen: true, guestName: item.name, phone: item.phone, waitId: item.id })}
                              className="h-9 w-9 rounded-xl border-emerald-300 text-[#008A45] bg-white hover:bg-emerald-50"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setNotifyModalData({ isOpen: true, guestName: item.name, phone: item.phone, waitId: item.id })}
                            className="w-full h-8 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            Notify Table Preparing
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TABLE CAPACITY & TURN-RATE SECTION (Dynamically Computed from DB) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Table Turn-rate & Capacity</h4>
                  <p className="text-xs text-slate-400">Current floor load ({tables.length} tables)</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#008A45]">{overallOccupancy}%</span>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Occupied</span>
                </div>
              </div>

              {/* Progress bars by Location */}
              {capacityBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tables configured in DB.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {capacityBreakdown.map((item) => (
                    <div key={item.location} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700">
                          {item.location} ({item.occupiedTables}/{item.totalTables} Tables)
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.occupancyPercentage === 100 ? "Full" : `${item.occupancyPercentage}%`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.occupancyPercentage === 100
                              ? "bg-pink-500"
                              : item.occupancyPercentage > 65
                              ? "bg-[#008A45]"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${item.occupancyPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Operational Alert */}
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-[#008A45] shrink-0 mt-0.5" />
                <span>
                  {tables.filter((t) => t.status === "occupied" || t.status === "cleaning").length > 0
                    ? `${tables.filter((t) => t.status === "occupied" || t.status === "cleaning").length} table(s) expected to clear soon.`
                    : "All tables clear."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onSave={handleSaveBooking}
        availableTables={dbTableOptions}
      />

      <AddToWaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        onSave={handleSaveWaitlist}
        currentWaitlistLength={activeWaitlist.length}
      />

      <SeatGuestModal
        isOpen={seatModalData.isOpen}
        onClose={() => setSeatModalData((prev) => ({ ...prev, isOpen: false }))}
        guestName={seatModalData.guestName}
        partySize={seatModalData.partySize}
        defaultTableId={seatModalData.defaultTable}
        onConfirmSeat={handleConfirmSeatGuest}
        tablesList={dbTableOptions}
      />

      <NotifyGuestModal
        isOpen={notifyModalData.isOpen}
        onClose={() => setNotifyModalData((prev) => ({ ...prev, isOpen: false }))}
        guestName={notifyModalData.guestName}
        phone={notifyModalData.phone}
        onNotifySent={async (channel) => {
          if (notifyModalData.waitId) {
            await waitlistService.notifyGuest(notifyModalData.waitId, channel as any);
          }
          toast.success(`Notification sent to ${notifyModalData.guestName} via ${channel.toUpperCase()}!`);
        }}
      />

      <ViewOrderModal
        isOpen={orderModalData.isOpen}
        onClose={() => setOrderModalData((prev) => ({ ...prev, isOpen: false }))}
        guestName={orderModalData.guestName}
        tableName={orderModalData.tableName}
      />
    </div>
  );
}
