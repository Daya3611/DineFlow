"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { Loader2, Plus, Trash2, Printer, QrCode, Users, LayoutGrid, MoreHorizontal } from "lucide-react";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import { AppDropdown } from "@/components/common/AppDropdown";

const statusConfig = {
  free:     { label: "Free",     dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200" },
  occupied: { label: "Occupied", dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200"       },
  reserved: { label: "Reserved", dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
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

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);
    const q = query(collection(db, "tables"), where("restaurantId", "==", restaurant.id));
    
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const fetched: TableType[] = [];
      snapshot.forEach((d: any) => fetched.push(d.data() as TableType));
      fetched.sort((a, b) => {
        const numA = parseInt(a.tableNumber), numB = parseInt(b.tableNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.tableNumber.localeCompare(b.tableNumber);
      });
      setTables(fetched);
      setLoading(false);
    }, (error: any) => {
      toast.error("Failed to load tables");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  const getMenuUrl = (tableNum: string) => {
    if (typeof window !== "undefined" && restaurant)
      return `${window.location.origin}/menu?restaurantId=${restaurant.id}&table=${encodeURIComponent(tableNum)}`;
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
      await setDoc(doc(db, "tables", tableId), newTable);
      setTables(prev => [...prev, newTable].sort((a, b) => {
        const numA = parseInt(a.tableNumber), numB = parseInt(b.tableNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.tableNumber.localeCompare(b.tableNumber);
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

  const printQrCode = (tableNum: string, tableId: string) => {
    const svgElement = qrRefs.current[tableId]?.querySelector("svg");
    if (!svgElement) { toast.error("Could not render QR"); return; }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    let printFrame = document.getElementById("qr-print-frame") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "qr-print-frame";
      Object.assign(printFrame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
      document.body.appendChild(printFrame);
    }
    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return toast.error("Printing not supported.");
    frameDoc.open();
    frameDoc.write(`
      <html><head><title>QR - Table ${tableNum}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; margin:0; background:#fff; }
        h1 { font-size:2rem; margin-bottom:1.5rem; color:#052e16; }
        .box { padding:32px; border:4px solid #10b981; border-radius:20px; }
        p { margin-top:1rem; color:#6b7280; font-size:1rem; }
        h2 { font-size:1.5rem; margin-top:1.5rem; color:#047857; }
      </style></head>
      <body>
        <h1>${restaurant?.name}</h1>
        <div class="box">${svgData}</div>
        <h2>Table ${tableNum}</h2>
        <p>Scan to view menu & order</p>
        <script>window.onload=()=>{setTimeout(()=>{window.print();},200);}<\/script>
      </body></html>
    `);
    frameDoc.close();
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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">QR Tables</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage seating, status, and generate QR codes for each table.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200 transition-all active:scale-[0.97] font-semibold" />
          }>
            <Plus className="mr-2 h-4 w-4" /> Add Table
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-gray-900">Add New Table</DialogTitle>
              <DialogDescription className="text-gray-500">Create a table to generate a unique QR code for customers.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-5 py-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tableNum" className="text-sm font-semibold text-gray-700">Table Name / Number</Label>
                  <Input
                    id="tableNum" value={tableNumber}
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
                      id="capacity" type="number" min="1" value={capacity}
                      onChange={e => setCapacity(e.target.value)}
                      placeholder="e.g. 4"
                      className="pl-10 h-11 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Used to match guests to the right table size.</p>
                </div>
              </div>
              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl bg-green-600 text-white hover:bg-green-700 font-semibold" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Table"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                              label: "Print QR Code",
                              icon: Printer,
                              onClick: () => printQrCode(table.tableNumber, table.id),
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
                        { label: "Free",     onClick: () => updateStatus(table.id, "free")     },
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

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
