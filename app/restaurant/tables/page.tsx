"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { Loader2, Plus, Trash2, Printer, QrCode, Users, Sparkles } from "lucide-react";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";
import { AppSheet } from "@/components/common/AppSheet";
import { QRTableCard } from "@/components/common/QRTableCard";
import { getPlanLimits } from "@/lib/plans";
import { UpgradeModal } from "@/components/common/UpgradeModal";

const statusConfig = {
  free: { label: "Free", dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" },
  occupied: { label: "Occupied", dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
  reserved: { label: "Reserved", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function TablesPage() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Premium QR card modal state
  const [qrCardTable, setQrCardTable] = useState<TableType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);
    
    const fetchTables = async () => {
      try {
        const res = await fetch(`/api/tables?restaurantId=${restaurant.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.sort((a: any, b: any) => {
            const numA = parseInt(a.tableNumber), numB = parseInt(b.tableNumber);
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

    fetchTables();
    const interval = setInterval(fetchTables, 10000); // Polling every 10s
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
    if (!tableNumber.trim()) { toast.error("Table number is required"); return; }
    if (tables.some(t => t.tableNumber.toLowerCase() === tableNumber.trim().toLowerCase())) {
      toast.error("Table number already exists"); return;
    }
    setSubmitting(true);
    try {
      const tableId = `table_${Date.now()}`;
      const newTable: TableType = {
        id: tableId, restaurantId: restaurant.id,
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

      setTables((prev: any) => [...prev, newTable].sort((a: any, b: any) => {
        const numA = parseInt(a.tableNumber), numB = parseInt(b.tableNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return (a.tableNumber || "").localeCompare(b.tableNumber || "");
      }));

      toast.success(`✅ Table ${tableNumber.trim()} added!`);
      setOpen(false);
      setTableNumber("");
      setCapacity("4");
    } catch { toast.error("Failed to add table"); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (tableId: string) => {
    if (!confirm("Delete this table? Its QR code will stop working.")) return;
    try {
      await deleteDoc(doc(db, "tables", tableId));
      setTables(tables.filter(t => t.id !== tableId));
      toast.success("Table deleted");
    } catch { toast.error("Failed to delete table"); }
  };

  const updateStatus = async (tableId: string, status: string) => {
    try {
      await updateDoc(doc(db, "tables", tableId), { status });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: status as any } : t));
    } catch { toast.error("Failed to update status"); }
  };

  // Summary stats
  const freeCount = tables.filter(t => !t.status || t.status === "free").length;
  const occupiedCount = tables.filter(t => t.status === "occupied").length;
  const reservedCount = tables.filter(t => t.status === "reserved").length;

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-gray-500 font-medium">
        Please complete restaurant setup first.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Premium QR Card Modal */}
      <AnimatePresence>
        {qrCardTable && (
          <QRTableCard
            tableNumber={qrCardTable.tableNumber}
            qrUrl={getMenuUrl(qrCardTable.tableNumber)}
            restaurantName={restaurant.name}
            restaurantLogo={restaurant.logo || undefined}
            onClose={() => setQrCardTable(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">QR Tables</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage seating, status, and generate QR codes for each table.</p>
        </div>
        <Button className="hover: [0.97]" onClick={() => {
            const limit = getPlanLimits(restaurant?.plan || "basic").tableLimit;
            if (tables.length >= limit) {
              setShowUpgradeModal(true);
            } else {
              setOpen(true);
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Table
        </Button>

        {/* Add Table Sheet */}
        <AppSheet
          open={open}
          onOpenChange={(v) => {
            if (!v) { setTableNumber(""); setCapacity("4"); }
            setOpen(v);
          }}
          title="Add New Table"
          description="Create a table to generate a unique QR code for customers."
          onSubmit={onSubmit}
          loading={submitting}
          submitLabel="Save Table"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tableNum" className="text-sm font-semibold text-gray-700">Table Name / Number</Label>
            <Input
              id="tableNum"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="e.g. 5, Balcony 1, VIP A"
              className="h-11 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity" className="text-sm font-semibold text-gray-700">Seating Capacity</Label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                placeholder="e.g. 4"
                className="pl-10 h-11 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500"
              />
            </div>
            <p className="text-xs text-gray-400">Used to match guests to the right table size.</p>
          </div>
        </AppSheet>

      </div>

      {/* ── Status Summary Bar ── */}
      {tables.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Free", count: freeCount, cfg: statusConfig.free },
            { label: "Occupied", count: occupiedCount, cfg: statusConfig.occupied },
            { label: "Reserved", count: reservedCount, cfg: statusConfig.reserved },
          ].map(({ label, count, cfg }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`h-3 w-3 rounded-full ${cfg.dot}`} />
              <div>
                <div className="text-xl font-extrabold text-gray-900">{count}</div>
                <div className="text-xs font-semibold text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tables Grid ── */}
      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-green-100 rounded-2xl py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No tables yet</h3>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">Add your first table to generate a scannable QR code for customers to order from.</p>
          <Button onClick={() => setOpen(true)} className="rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200 font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add your first table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {tables.map((table, i) => {
              const url = getMenuUrl(table.tableNumber);
              const curStatus = (table.status as keyof typeof statusConfig) || "free";
              const cfg = statusConfig[curStatus] ?? statusConfig.free;
              return (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  {/* ── Card ── */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-250 p-5 flex flex-col gap-4">

                    {/* Header: label · capacity · actions */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-green-700 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-full border border-green-100 truncate">
                        Table {table.tableNumber}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-100">
                          <Users className="h-3 w-3" /> {table.capacity || 4}
                        </span>
                        <AppDropdown
                          items={[
                            {
                              label: "Premium QR Card",
                              icon: Sparkles,
                              onClick: () => setQrCardTable(table),
                            },
                            {
                              label: "Quick Print",
                              icon: Printer,
                              onClick: () => {
                                // Legacy quick print via the card modal in print mode
                                setQrCardTable(table);
                              },
                            },
                            {
                              label: "Delete Table",
                              icon: Trash2,
                              danger: true,
                              separator: true,
                              onClick: () => onDelete(table.id),
                            },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Status selector */}
                    <AppDropdown
                      triggerContent={
                        <>
                          <div className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                          <span>{cfg.label}</span>
                        </>
                      }
                      triggerClassName={`w-full justify-start gap-2 text-xs font-bold px-3 py-2 h-auto ${cfg.badge} border hover:brightness-95 hover:bg-transparent`}
                      align="start"
                      items={[
                        { label: "Free", onClick: () => updateStatus(table.id, "free") },
                        { label: "Occupied", onClick: () => updateStatus(table.id, "occupied") },
                        { label: "Reserved", onClick: () => updateStatus(table.id, "reserved") },
                      ]}
                    />

                    {/* QR Code — centered */}
                    <div className="flex justify-center">
                      <div
                        ref={el => { qrRefs.current[table.id] = el; }}
                        className="bg-white p-4 rounded-2xl border-2 border-green-100 shadow-inner"
                      >
                        <QRCode value={url} size={128} level="H" fgColor="#052e16" />
                      </div>
                    </div>

                    {/* Premium card button */}
                    <Button onClick={() => setQrCardTable(table)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-bold tracking-wide hover:from-emerald-500 hover:to-green-400 transition-all active:scale-[0.97] shadow-md shadow-green-200"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Print Premium Card
                    </Button>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
        featureName="tables" 
        limit={restaurant ? getPlanLimits(restaurant.plan || "basic").tableLimit : 10} 
      />
    </div>
  );
}
