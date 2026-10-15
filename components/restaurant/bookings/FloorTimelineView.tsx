"use client";

import React from "react";
import { Reservation } from "@/types";
import { Clock, MapPin, Users, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FloorTimelineViewProps {
  reservations: Reservation[];
  onSelectReservation: (res: Reservation) => void;
}

export function FloorTimelineView({ reservations, onSelectReservation }: FloorTimelineViewProps) {
  const timeSlots = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  const tables = [
    { id: "T-1", name: "T-1 (Indoor)", capacity: 2 },
    { id: "T-2", name: "T-2 (Indoor)", capacity: 4 },
    { id: "T-3", name: "T-3 (Indoor)", capacity: 4 },
    { id: "T-4", name: "T-4 (Window)", capacity: 6 },
    { id: "T-5", name: "T-5 (Patio)", capacity: 2 },
    { id: "T-6", name: "T-6 (Patio)", capacity: 4 },
    { id: "P-1", name: "P-1 (Private)", capacity: 8 },
    { id: "P-2", name: "P-2 (Private)", capacity: 8 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-[#008A45]" /> Floor Schedule Timeline (Today)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time allocation matrix across tables and time windows.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#008A45]" /> Seated Now
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Confirmed
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Completed
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[850px]">
          {/* Header Row */}
          <div className="grid grid-cols-[160px_repeat(11,_1fr)] border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <div className="p-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-10">Table / Slot</div>
            {timeSlots.map((slot) => (
              <div key={slot} className="p-3 text-center border-r border-slate-200/60 last:border-r-0">
                {slot}
              </div>
            ))}
          </div>

          {/* Table Rows */}
          {tables.map((table) => {
            return (
              <div key={table.id} className="grid grid-cols-[160px_repeat(11,_1fr)] border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className="p-3 border-r border-slate-200 bg-white sticky left-0 z-10 flex flex-col justify-center">
                  <span className="font-extrabold text-xs text-slate-900">{table.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Cap: {table.capacity} guests</span>
                </div>

                {timeSlots.map((slot) => {
                  // Find reservation matching this table & time slot roughly
                  const match = reservations.find((r) => {
                    const matchTable = r.tableId === table.id || r.tableName?.includes(table.id);
                    const matchTime = r.time === slot || (r.slotStartTime && r.slotStartTime <= slot && (r.slotEndTime ? r.slotEndTime > slot : true));
                    return matchTable && matchTime;
                  });

                  if (!match) {
                    return (
                      <div key={slot} className="p-1 border-r border-slate-100 last:border-r-0 flex items-center justify-center">
                        <span className="text-[10px] text-slate-200 font-medium hover:text-emerald-600 cursor-pointer">+</span>
                      </div>
                    );
                  }

                  let bgClass = "bg-blue-50 border-blue-200 text-blue-800";
                  if (match.status === "seated" || match.status === "seated_now" || match.status === "arrived") {
                    bgClass = "bg-emerald-100 border-[#008A45] text-emerald-900 font-bold";
                  } else if (match.status === "completed") {
                    bgClass = "bg-slate-100 border-slate-200 text-slate-600";
                  }

                  return (
                    <div
                      key={slot}
                      onClick={() => onSelectReservation(match)}
                      className="p-1 border-r border-slate-100 last:border-r-0 cursor-pointer"
                    >
                      <div className={`h-full w-full rounded-lg p-1.5 border text-[10px] flex flex-col justify-between truncate transition-transform hover:scale-[1.02] shadow-xs ${bgClass}`}>
                        <span className="font-bold truncate">{match.customerName}</span>
                        <span className="text-[9px] opacity-80">{match.guestCount}p</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
