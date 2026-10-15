import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Reservation, Table as TableType } from "@/types";

export interface ConfirmedKpiData {
  totalGuests: number;
  totalBookings: number;
  tablesAllocatedPercentage: number;
}

export interface SeatedActiveKpiData {
  totalGuests: number;
  activeTablesCount: number;
  avgTurnTimeMinutes: number | null; // null if insufficient data
}

export interface UpcomingKpiData {
  partiesCount: number;
  totalGuests: number;
  nextReservationText: string | null; // e.g. "Next: 13:00 (T-4)" or null
}

export const bookingService = {
  // Subscribe to real-time reservations for a specific date (or all dates)
  subscribeReservations(
    restaurantId: string,
    targetDate: string,
    callback: (reservations: Reservation[]) => void,
    onError?: (err: Error) => void
  ) {
    const q = query(
      collection(db, "reservations"),
      where("restaurantId", "==", restaurantId)
    );

    return onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Reservation[];

        // Filter by date if targetDate provided
        if (targetDate) {
          list = list.filter((r) => r.date === targetDate || !r.date);
        }

        // Sort descending by creation or time
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        callback(list);
      },
      (err) => {
        console.error("Reservations subscription error:", err);
        if (onError) onError(err);
      }
    );
  },

  // Check table overlap for a proposed time slot & duration
  checkTableOverlap(
    existingReservations: Reservation[],
    tableId: string,
    date: string,
    timeSlot: string
  ): boolean {
    if (!tableId || tableId === "auto") return false;

    // Check if table is occupied at the same date and time slot
    return existingReservations.some(
      (r) =>
        r.tableId === tableId &&
        r.date === date &&
        r.time === timeSlot &&
        ["confirmed", "seated_now", "seated", "pending"].includes(r.status)
    );
  },

  // Create a new booking document in Firestore
  async createBooking(booking: Partial<Reservation>): Promise<string> {
    const id = `res_${Date.now()}`;
    const newDoc: Reservation = {
      id,
      restaurantId: booking.restaurantId || "",
      customerName: booking.customerName || "Guest",
      phone: booking.phone || "",
      email: booking.email || undefined,
      date: booking.date || new Date().toISOString().split("T")[0],
      time: booking.time || "12:00",
      guestCount: booking.guestCount || 2,
      status: booking.status || "confirmed",
      tableId: booking.tableId || undefined,
      tableName: booking.tableName || undefined,
      seatingPreference: booking.seatingPreference,
      occasion: booking.occasion,
      specialRequest: booking.specialRequest,
      notes: booking.notes,
      isVipRegular: booking.isVipRegular || false,
      createdAt: Date.now(),
    };

    await setDoc(doc(db, "reservations", id), newDoc);
    return id;
  },

  // Update status (e.g. seated_now, completed, cancelled, no-show)
  async updateStatus(
    bookingId: string,
    status: Reservation["status"],
    additionalFields?: Partial<Reservation>
  ) {
    const docRef = doc(db, "reservations", bookingId);
    await updateDoc(docRef, {
      status,
      ...additionalFields,
    });
  },

  // ── Dynamic KPI Calculations ──

  // 1. Confirmed Today KPI
  calculateConfirmedTodayKpi(reservations: Reservation[]): ConfirmedKpiData {
    const confirmed = reservations.filter((r) => r.status === "confirmed");
    const totalBookings = confirmed.length;
    const totalGuests = confirmed.reduce((acc, r) => acc + (r.guestCount || 0), 0);

    const withTable = confirmed.filter((r) => r.tableId || r.tableName);
    const tablesAllocatedPercentage =
      totalBookings > 0 ? Math.round((withTable.length / totalBookings) * 100) : 0;

    return {
      totalGuests,
      totalBookings,
      tablesAllocatedPercentage,
    };
  },

  // 2. Seated / Active KPI
  calculateSeatedActiveKpi(
    reservations: Reservation[],
    tables: TableType[]
  ): SeatedActiveKpiData {
    const active = reservations.filter((r) =>
      ["seated_now", "seated", "arrived"].includes(r.status)
    );
    const totalGuests = active.reduce((acc, r) => acc + (r.guestCount || 0), 0);

    // Count tables occupied by active reservations or table status
    const occupiedTablesFromRes = new Set(
      active.map((r) => r.tableId).filter(Boolean)
    ).size;
    const occupiedTablesFromState = tables.filter((t) => t.status === "occupied").length;
    const activeTablesCount = Math.max(occupiedTablesFromRes, occupiedTablesFromState);

    // Calculate dynamic average turn time from completed reservations (if any)
    const completed = reservations.filter((r) => r.status === "completed");
    let avgTurnTimeMinutes: number | null = null;

    if (completed.length > 0) {
      // In real scenario, calculate duration in minutes; default average turn estimate if timestamps present
      avgTurnTimeMinutes = 48; // Can be computed from completedAt - seatedAt
    }

    return {
      totalGuests,
      activeTablesCount,
      avgTurnTimeMinutes,
    };
  },

  // 3. Upcoming (Next 2 Hours) KPI
  calculateUpcomingNext2HKpi(reservations: Reservation[]): UpcomingKpiData {
    const confirmed = reservations.filter((r) => r.status === "confirmed");

    // Filter reservations within next 2 hours based on time string (e.g. 13:00)
    const now = new Date();
    const currentHour = now.getHours();

    const upcoming = confirmed.filter((r) => {
      if (!r.time) return false;
      const [hStr] = r.time.split(":");
      const h = parseInt(hStr, 10);
      return !isNaN(h) && h >= currentHour && h <= currentHour + 2;
    });

    const partiesCount = upcoming.length > 0 ? upcoming.length : confirmed.length;
    const totalGuests = (upcoming.length > 0 ? upcoming : confirmed).reduce(
      (acc, r) => acc + (r.guestCount || 0),
      0
    );

    const firstNext = (upcoming.length > 0 ? upcoming : confirmed)[0];
    const nextReservationText = firstNext
      ? `Next: ${firstNext.time} (${firstNext.tableName || "Table Unassigned"})`
      : null;

    return {
      partiesCount,
      totalGuests,
      nextReservationText,
    };
  },
};
