"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Users, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSheet } from "@/components/common/AppSheet";
import { getPlanLimits } from "@/lib/plans";
import { UpgradeModal } from "@/components/common/UpgradeModal";
import { TableCard, QRModal } from "@/components/tables";

export default function TablesPage() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("4");

  // QR Modal State
  const [qrModalTable, setQrModalTable] = useState<TableType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [maxTableLimit, setMaxTableLimit] = useState<number>(10);

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);

    const fetchTables = async () => {
      try {
        const res = await fetch(`/api/tables?restaurantId=${restaurant.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.sort((a: any, b: any) => {
            const numA = parseInt(a.tableNumber),
              numB = parseInt(b.tableNumber);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return (a.tableNumber || "").localeCompare(b.tableNumber || "");
          });
          setTables(data);
        }
      } catch (error) {
        toast.error("Failed to load tables");
      } finally {
        setLoading(false);
      }
    };

    const fetchLimit = async () => {
      try {
        const planId = restaurant.plan || "basic";
        const staticLimit = getPlanLimits(planId).tableLimit || 10;
        if (planId === "trial" || planId === "lifetime") {
          setMaxTableLimit(staticLimit);
          return;
        }
        const snap = await getDoc(doc(db, "plans", planId));
        if (snap.exists()) {
          setMaxTableLimit(snap.data().tableLimit ?? staticLimit);
        } else {
          setMaxTableLimit(staticLimit);
        }
      } catch (err) {
        console.error("Failed to fetch plan limit:", err);
      }
    };

    fetchTables();
    fetchLimit();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [restaurant]);

  const getMenuUrl = (tableNum: string) => {
    if (typeof window !== "undefined" && restaurant) {
      const slug = restaurant.customSlug || restaurant.id;
      return `${window.location.origin}/@${slug}/menu?table=${encodeURIComponent(tableNum)}`;
    }
    return "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    if (!tableNumber.trim()) {
      toast.error("Table number is required");
      return;
    }
    if (
      tables.some(
        (t) => t.tableNumber.toLowerCase() === tableNumber.trim().toLowerCase()
      )
    ) {
      toast.error("Table number already exists");
      return;
    }
    setSubmitting(true);
    try {
      const tableId = `table_${Date.now()}`;
      const newTable: TableType = {
        id: tableId,
        restaurantId: restaurant.id,
        tableNumber: tableNumber.trim(),
        capacity: parseInt(capacity) || 4,
        qrCodeUrl: getMenuUrl(tableNumber.trim()),
        createdAt: Date.now(),
      };

      const res = await fetch("/api/limits/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, feature: "tables" }),
      });

      const data = await res.json();
      if (!res.ok || data.allowed === false) {
        if (data.error && data.error.includes("Limit reached")) {
          toast.error(data.error);
          setShowUpgradeModal(true);
          setOpen(false);
          return;
        }
        throw new Error(data.error || "Failed to add table");
      }

      await setDoc(doc(db, "tables", tableId), newTable);

      setTables((prev: any) =>
        [...prev, newTable].sort((a: any, b: any) => {
          const numA = parseInt(a.tableNumber),
            numB = parseInt(b.tableNumber);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.tableNumber || "").localeCompare(b.tableNumber || "");
        })
      );

      toast.success(`✅ Table ${tableNumber.trim()} added!`);
      setOpen(false);
      setTableNumber("");
      setCapacity("4");
    } catch {
      toast.error("Failed to add table");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (tableId: string) => {
    if (!confirm("Delete this table? Its QR code will stop working.")) return;
    try {
      await deleteDoc(doc(db, "tables", tableId));
      setTables(tables.filter((t) => t.id !== tableId));
      toast.success("Table deleted");
    } catch {
      toast.error("Failed to delete table");
    }
  };

  const updateStatus = async (tableId: string, status: string) => {
    try {
      await updateDoc(doc(db, "tables", tableId), { status });
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: status as any } : t))
      );
      toast.success(`Table status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Summary counts
  const freeCount = tables.filter((t) => !t.status || t.status === "free").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const reservedCount = tables.filter((t) => t.status === "reserved").length;
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 4), 0);

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-slate-500 font-medium">
        Please complete restaurant setup first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Modal Popover */}
      {qrModalTable && (
        <QRModal
          isOpen={!!qrModalTable}
          onClose={() => setQrModalTable(null)}
          tableNumber={qrModalTable.tableNumber}
          capacity={qrModalTable.capacity}
          qrUrl={getMenuUrl(qrModalTable.tableNumber)}
          restaurantName={restaurant.name}
          restaurantLogo={restaurant.logo || undefined}
        />
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            QR Tables
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
            Manage seating, live status, and generate QR codes for digital menus.
          </p>
        </div>
        <Button
          onClick={() => {
            if (tables.length >= maxTableLimit) {
              setShowUpgradeModal(true);
            } else {
              setOpen(true);
            }
          }}
          className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl shadow-xs gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Table
        </Button>
      </div>

      {/* ── Add Table Sheet ── */}
      <AppSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setTableNumber("");
            setCapacity("4");
          }
          setOpen(v);
        }}
        title="Add New Table"
        description="Create a table to generate a unique QR code for customers."
        onSubmit={onSubmit}
        loading={submitting}
        submitLabel="Save Table"
      >
        <div className="space-y-1.5">
          <Label htmlFor="tableNum" className="text-sm font-semibold text-slate-700">
            Table Name / Number
          </Label>
          <Input
            id="tableNum"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 5, Balcony 1, VIP A"
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#16A34A]"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity" className="text-sm font-semibold text-slate-700">
            Seating Capacity
          </Label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 4"
              className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-[#16A34A]"
            />
          </div>
          <p className="text-xs text-slate-400">Used to match guests to the right table size.</p>
        </div>
      </AppSheet>

      {/* ── Compact Status Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <span className="h-3 w-3 rounded-full bg-[#16A34A] shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">FREE</div>
            <div className="text-xl font-extrabold text-slate-900">{freeCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              OCCUPIED
            </div>
            <div className="text-xl font-extrabold text-slate-900">{occupiedCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              RESERVED
            </div>
            <div className="text-xl font-extrabold text-slate-900">{reservedCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <LayoutGrid className="h-4 w-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TOTAL CAPACITY
            </div>
            <div className="text-xl font-extrabold text-slate-900">{totalCapacity} pax</div>
          </div>
        </div>
      </div>

      {/* ── Floor-Plan Tables Grid ── */}
      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl py-16 px-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto mb-3">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No tables created yet</h3>
          <p className="text-slate-500 mb-5 max-w-xs mx-auto text-xs">
            Add your restaurant tables to view top-down seating plans and generate digital menu QR codes.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Your First Table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {tables.map((table, i) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="h-full"
              >
                <TableCard
                  table={table}
                  onUpdateStatus={updateStatus}
                  onDeleteTable={onDelete}
                  onOpenQRModal={() => setQrModalTable(table)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Limit Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        featureName="tables"
        limit={maxTableLimit}
      />
    </div>
  );
}
