"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Table as TableType } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Printer, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";

export default function TablesPage() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (restaurant) fetchTables();
  }, [restaurant]);

  const fetchTables = async () => {
    try {
      const q = query(collection(db, "tables"), where("restaurantId", "==", restaurant?.id));
      const qs = await getDocs(q);
      const fetched: TableType[] = [];
      qs.forEach((d) => fetched.push(d.data() as TableType));
      fetched.sort((a, b) => {
        const numA = parseInt(a.tableNumber), numB = parseInt(b.tableNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.tableNumber.localeCompare(b.tableNumber);
      });
      setTables(fetched);
    } catch (_) {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const getMenuUrl = (tableNum: string) => {
    if (typeof window !== "undefined" && restaurant) {
      return `${window.location.origin}/menu?restaurantId=${restaurant.id}&table=${encodeURIComponent(tableNum)}`;
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
        id: tableId,
        restaurantId: restaurant.id,
        tableNumber: tableNumber.trim(),
        qrCodeUrl: getMenuUrl(tableNumber.trim()),
        createdAt: Date.now(),
      };
      await setDoc(doc(db, "tables", tableId), newTable);
      setTables(prev => [...prev, newTable]);
      toast.success(`Table ${tableNumber.trim()} added!`);
      setOpen(false);
      setTableNumber("");
    } catch (_) {
      toast.error("Failed to add table");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (tableId: string) => {
    if (!confirm("Delete this table? Its QR code will stop working for new scans.")) return;
    try {
      await deleteDoc(doc(db, "tables", tableId));
      setTables(tables.filter(t => t.id !== tableId));
      toast.success("Table deleted");
    } catch (_) {
      toast.error("Failed to delete table");
    }
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

  if (!restaurant) return <div className="p-8 text-center text-gray-500">Please complete restaurant setup first.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">QR Tables</h1>
          <p className="text-gray-500 mt-1 text-sm">Generate and manage QR codes for each table in your restaurant.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger 
            render={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm shadow-emerald-200" />}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Table
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold">Add New Table</DialogTitle>
              <DialogDescription>Create a table to generate a unique QR code.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tableNum" className="text-sm font-medium text-gray-700">Table Name / Number</Label>
                <Input
                  id="tableNum"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. 5, Balcony 1, VIP A"
                  className="h-11 rounded-xl border-gray-200"
                  autoFocus
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Table"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No tables yet</h3>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">Add your first table to generate a scannable QR code for customers.</p>
          <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add your first table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {tables.map((table, i) => {
            const url = getMenuUrl(table.tableNumber);
            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-6 flex flex-col items-center text-center relative group">
                  {/* Delete btn */}
                  <button
                    onClick={() => onDelete(table.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete table"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Table {table.tableNumber}
                  </div>

                  {/* QR Code */}
                  <div
                    ref={(el) => { qrRefs.current[table.id] = el; }}
                    className="bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-inner mb-6"
                  >
                    <QRCode value={url} size={130} level="H" fgColor="#052e16" />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold text-sm"
                    onClick={() => printQrCode(table.tableNumber, table.id)}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print QR
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
