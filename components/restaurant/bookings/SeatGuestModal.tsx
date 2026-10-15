"use client";

import React, { useState } from "react";
import { Dialog as BaseDialog, DialogContent as Content, DialogHeader as Header, DialogTitle as Title, DialogFooter as Footer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CheckCircle2, AlertCircle, Sparkles, Utensils } from "lucide-react";

export interface TableOption {
  id: string;
  tableNumber: string;
  capacity: number;
  location: "Indoor AC" | "Outdoor Patio" | "Private Dining";
  status: "free" | "occupied" | "cleaning" | "reserved";
  estimatedRelease?: string;
}

interface SeatGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  partySize: number;
  defaultTableId?: string;
  onConfirmSeat: (tableId: string, tableName: string) => void;
  tablesList?: TableOption[];
}

export function SeatGuestModal({
  isOpen,
  onClose,
  guestName,
  partySize,
  defaultTableId,
  onConfirmSeat,
  tablesList,
}: SeatGuestModalProps) {
  // Firestore tables list or fallback defaults
  const tables: TableOption[] = (tablesList && tablesList.length > 0) ? tablesList : [
    { id: "t-1", tableNumber: "T-1", capacity: 2, location: "Indoor AC", status: "free" },
    { id: "t-2", tableNumber: "T-2", capacity: 4, location: "Indoor AC", status: "free" },
    { id: "t-3", tableNumber: "T-3", capacity: 4, location: "Indoor AC", status: "occupied", estimatedRelease: "15m" },
    { id: "t-4", tableNumber: "T-4", capacity: 6, location: "Indoor AC", status: "free" },
    { id: "t-5", tableNumber: "T-5", capacity: 2, location: "Outdoor Patio", status: "cleaning", estimatedRelease: "5m" },
    { id: "t-6", tableNumber: "T-6", capacity: 4, location: "Outdoor Patio", status: "free" },
    { id: "t-7", tableNumber: "T-7", capacity: 4, location: "Outdoor Patio", status: "occupied" },
    { id: "p-1", tableNumber: "P-1", capacity: 8, location: "Private Dining", status: "reserved" },
    { id: "p-2", tableNumber: "P-2", capacity: 8, location: "Private Dining", status: "occupied" },
  ];

  // Pick default selected table
  const initialSelected = defaultTableId || (tables.find(t => t.status === "free" && t.capacity >= partySize)?.id || tables[0]?.id || "");
  const [selectedId, setSelectedId] = useState<string>(initialSelected);

  const selectedTable = tables.find(t => t.id === selectedId);

  const handleConfirm = () => {
    if (!selectedTable) return;
    const nameStr = `Table ${selectedTable.tableNumber} (${selectedTable.location})`;
    onConfirmSeat(selectedTable.id, nameStr);
    onClose();
  };

  const locations = ["Indoor AC", "Outdoor Patio", "Private Dining"] as const;

  return (
    <BaseDialog open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        <Header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <Title className="text-lg font-bold text-slate-900">Seat Guest at Table</Title>
              <p className="text-xs text-slate-500">
                Seating <span className="font-bold text-slate-800">{guestName}</span> ({partySize} guest{partySize > 1 ? "s" : ""})
              </p>
            </div>
          </div>
        </Header>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Recommended Matching Tables:
            </div>
            <span className="text-[11px] font-bold text-slate-500">Party Size: {partySize}</span>
          </div>

          {/* Table Groups by Location */}
          <div className="space-y-4">
            {locations.map((loc) => {
              const locTables = tables.filter(t => t.location === loc);
              if (locTables.length === 0) return null;

              return (
                <div key={loc} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{loc}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {locTables.filter(t => t.status === "free").length} available
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {locTables.map((table) => {
                      const isSelected = table.id === selectedId;
                      const isFit = table.capacity >= partySize;
                      const isFree = table.status === "free";

                      let statusBadge = null;
                      if (table.status === "free") {
                        statusBadge = <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Available</span>;
                      } else if (table.status === "cleaning") {
                        statusBadge = <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Cleaning ({table.estimatedRelease})</span>;
                      } else {
                        statusBadge = <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Occupied</span>;
                      }

                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => setSelectedId(table.id)}
                          className={`
                            p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-[82px]
                            ${isSelected
                              ? "bg-emerald-50/80 border-[#008A45] ring-2 ring-[#008A45]/20 shadow-sm"
                              : isFree
                              ? "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                              : "bg-slate-50 border-slate-200 opacity-70"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-extrabold text-sm text-slate-900">{table.tableNumber}</span>
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-0.5">
                              <Users className="h-3 w-3" /> {table.capacity}
                            </span>
                          </div>

                          <div className="flex items-center justify-between w-full mt-1">
                            {statusBadge}
                            {isFree && isFit && (
                              <span className="text-[10px] text-emerald-600 font-bold">Best Fit</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Footer className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Selected: <span className="font-bold text-slate-900">{selectedTable ? `${selectedTable.tableNumber} (${selectedTable.location})` : "None"}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 border-slate-200">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedTable}
                className="bg-[#008A45] hover:bg-[#00743a] text-white font-bold rounded-xl h-10 px-5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm & Seat Now
              </Button>
            </div>
          </Footer>
        </div>
      </Content>
    </BaseDialog>
  );
}
