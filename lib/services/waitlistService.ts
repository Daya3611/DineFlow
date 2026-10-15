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
import { Waitlist, Table as TableType } from "@/types";

export interface WaitlistKpiData {
  waitingCount: number;
  estimatedWaitText: string;
  releasingTablesCount: number;
}

export const waitlistService = {
  // Subscribe to real-time waitlist entries for a restaurant
  subscribeWaitlist(
    restaurantId: string,
    callback: (waitlist: Waitlist[]) => void,
    onError?: (err: Error) => void
  ) {
    const q = query(
      collection(db, "waitlist"),
      where("restaurantId", "==", restaurantId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Waitlist[];

        // Sort by timestamp (oldest joined first)
        list.sort((a, b) => (a.time || 0) - (b.time || 0));

        callback(list);
      },
      (err) => {
        console.error("Waitlist subscription error:", err);
        if (onError) onError(err);
      }
    );
  },

  // Create a new waitlist entry
  async createWaitlistEntry(entry: Partial<Waitlist>): Promise<string> {
    const id = `wait_${Date.now()}`;
    const newDoc: Waitlist = {
      id,
      restaurantId: entry.restaurantId || "",
      name: entry.name || "Guest",
      phone: entry.phone || "",
      guests: entry.guests || 2,
      waitedTime: "Just Joined",
      estimatedWait: entry.estimatedWait || "~15m wait left",
      preference: entry.preference || "Indoor AC",
      status: "waiting",
      time: Date.now(),
      specialRequest: entry.specialRequest,
      partyTag: (entry.guests || 2) >= 6 ? "Large" : undefined,
    };

    await setDoc(doc(db, "waitlist", id), newDoc);
    return id;
  },

  // Update waitlist entry status
  async updateStatus(
    waitlistId: string,
    status: Waitlist["status"],
    additionalData?: Partial<Waitlist>
  ) {
    const docRef = doc(db, "waitlist", waitlistId);
    await updateDoc(docRef, {
      status,
      ...additionalData,
    });
  },

  // Store guest notification in Firestore
  async notifyGuest(waitlistId: string, channel: "sms" | "whatsapp" | "call") {
    const docRef = doc(db, "waitlist", waitlistId);
    await updateDoc(docRef, {
      status: "notified",
      notifiedAt: Date.now(),
      notificationMethod: channel,
    });
  },

  // ── Automatic Table Ready Matching Logic ──
  // Scan free tables and identify eligible waitlist parties
  matchTableReadyParties(waitlist: Waitlist[], tables: TableType[]) {
    const freeTables = tables.filter((t) => !t.status || t.status === "free");
    const activeWaitlist = waitlist.filter((w) => w.status === "waiting");

    if (freeTables.length === 0 || activeWaitlist.length === 0) return;

    // For each free table, find the top waiting party whose party size fits
    freeTables.forEach((table) => {
      const eligibleParty = activeWaitlist.find(
        (w) => w.guests <= (table.capacity || 4)
      );

      if (eligibleParty && eligibleParty.status === "waiting") {
        // Mark party as table ready in memory / DB
        eligibleParty.status = "table_ready";
        eligibleParty.tableAvailability = `T-${table.tableNumber} Open`;
      }
    });
  },

  // Dynamic Waitlist KPI calculation
  calculateWaitlistKpi(waitlist: Waitlist[], tables: TableType[]): WaitlistKpiData {
    const activeList = waitlist.filter((w) =>
      ["waiting", "table_ready"].includes(w.status)
    );
    const waitingCount = activeList.length;

    // Estimate wait time based on queue length
    let estimatedWaitText = "10-15m";
    if (waitingCount === 0) estimatedWaitText = "No queue";
    else if (waitingCount <= 2) estimatedWaitText = "5-12m";
    else if (waitingCount <= 5) estimatedWaitText = "12-20m";
    else estimatedWaitText = "25-35m";

    // Count tables that are occupied and expected to clear soon
    const occupiedTables = tables.filter((t) => t.status === "occupied" || t.status === "cleaning");
    const releasingTablesCount = Math.min(occupiedTables.length, 2);

    return {
      waitingCount,
      estimatedWaitText,
      releasingTablesCount,
    };
  },
};
