import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { Table as TableType } from "@/types";

export interface LocationCapacityBreakdown {
  location: string;
  totalTables: number;
  occupiedTables: number;
  availableTables: number;
  occupancyPercentage: number;
}

export const tableService = {
  // Subscribe to real-time table updates for a restaurant
  subscribeTables(
    restaurantId: string,
    callback: (tables: TableType[]) => void,
    onError?: (err: Error) => void
  ) {
    const q = query(
      collection(db, "tables"),
      where("restaurantId", "==", restaurantId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TableType[];

        // Sort by table number (numeric or string)
        list.sort((a, b) => {
          const numA = parseInt(a.tableNumber);
          const numB = parseInt(b.tableNumber);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.tableNumber || "").localeCompare(b.tableNumber || "");
        });

        callback(list);
      },
      (err) => {
        console.error("Table subscription error:", err);
        if (onError) onError(err);
      }
    );
  },

  // Update table status in Firestore
  async updateTableStatus(
    tableId: string,
    status: "free" | "occupied" | "reserved" | "cleaning"
  ) {
    const docRef = doc(db, "tables", tableId);
    await updateDoc(docRef, { status });
  },

  // Dynamically calculate capacity breakdown by location (Indoor AC, Outdoor Patio, Private Dining, etc.)
  calculateLocationCapacity(tables: TableType[]): LocationCapacityBreakdown[] {
    if (!tables || tables.length === 0) return [];

    const grouped: Record<string, { total: number; occupied: number }> = {};

    tables.forEach((t) => {
      // Default location inferrence if missing
      const loc =
        t.location ||
        (t.tableNumber.startsWith("P")
          ? "Private Dining"
          : t.tableNumber.startsWith("T-5") ||
            t.tableNumber.startsWith("T-6") ||
            t.tableNumber.startsWith("T-7")
          ? "Outdoor Patio"
          : "Indoor AC");

      if (!grouped[loc]) {
        grouped[loc] = { total: 0, occupied: 0 };
      }
      grouped[loc].total += 1;
      if (t.status === "occupied") {
        grouped[loc].occupied += 1;
      }
    });

    return Object.entries(grouped).map(([location, data]) => {
      const available = data.total - data.occupied;
      const percentage =
        data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
      return {
        location,
        totalTables: data.total,
        occupiedTables: data.occupied,
        availableTables: available,
        occupancyPercentage: percentage,
      };
    });
  },

  // Calculate overall floor occupancy percentage
  calculateOverallOccupancy(tables: TableType[]): number {
    if (!tables || tables.length === 0) return 0;
    const occupied = tables.filter((t) => t.status === "occupied").length;
    return Math.round((occupied / tables.length) * 100);
  },

  // Find compatible available tables for a given party size
  findAvailableMatchingTables(tables: TableType[], partySize: number): TableType[] {
    return tables.filter(
      (t) => (!t.status || t.status === "free") && (t.capacity || 4) >= partySize
    );
  },
};
