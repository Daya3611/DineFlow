"use client";

import React, { useState } from "react";
import { Users, QrCode, Download, Printer, Trash2, Sparkles, ChevronDown } from "lucide-react";
import { RestaurantTable } from "./RestaurantTable";
import { AppDropdown } from "@/components/common/AppDropdown";
import { Button } from "@/components/ui/button";
import { TableStatus } from "@/types";

interface TableCardProps {
  table: {
    id: string;
    tableNumber: string;
    capacity: number;
    status?: TableStatus;
    qrCodeUrl?: string;
  };
  onUpdateStatus: (tableId: string, status: string) => void;
  onDeleteTable: (tableId: string) => void;
  onOpenQRModal: () => void;
}

const statusConfig = {
  free: {
    label: "FREE",
    dotClass: "bg-[#16A34A]",
    badgeClass: "bg-emerald-50 text-[#16A34A] border-emerald-200/80 hover:bg-emerald-100/60",
  },
  occupied: {
    label: "OCCUPIED",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100/60",
  },
  reserved: {
    label: "RESERVED",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/60",
  },
  cleaning: {
    label: "CLEANING",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/60",
  },
};

export function TableCard({
  table,
  onUpdateStatus,
  onDeleteTable,
  onOpenQRModal,
}: TableCardProps) {
  const currentStatus = (table.status as keyof typeof statusConfig) || "free";
  const cfg = statusConfig[currentStatus] ?? statusConfig.free;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-300 p-5 flex flex-col justify-between h-full group">
      {/* 1. Header: Table Label · Capacity · Actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
            Table {table.tableNumber}
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
            <Users className="h-3 w-3 text-slate-400" />
            {table.capacity || 4} Seats
          </p>
        </div>

        <AppDropdown
          items={[
            {
              label: "View QR Code",
              icon: QrCode,
              onClick: onOpenQRModal,
            },
            {
              label: "Quick Print",
              icon: Printer,
              onClick: onOpenQRModal,
            },
            {
              label: "Delete Table",
              icon: Trash2,
              danger: true,
              separator: true,
              onClick: () => onDeleteTable(table.id),
            },
          ]}
        />
      </div>

      {/* 2. Primary Visual: Top-Down Restaurant Floor Plan Table */}
      <div className="my-3 py-2 flex items-center justify-center min-h-[160px] bg-slate-50/50 rounded-2xl border border-slate-100/80 group-hover:bg-slate-50 transition-colors">
        <RestaurantTable
          tableNumber={table.tableNumber}
          capacity={table.capacity || 4}
          status={currentStatus}
        />
      </div>

      {/* 3. Status Selector Bar */}
      <div className="mb-4">
        <AppDropdown
          triggerContent={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cfg.dotClass} shrink-0 animate-pulse`} />
                <span className="font-extrabold text-[11px] uppercase tracking-wider">
                  {cfg.label}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </div>
          }
          triggerClassName={`w-full text-left px-3 py-2 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${cfg.badgeClass}`}
          align="start"
          items={[
            {
              label: "Mark as Free",
              onClick: () => onUpdateStatus(table.id, "free"),
            },
            {
              label: "Mark as Occupied",
              onClick: () => onUpdateStatus(table.id, "occupied"),
            },
            {
              label: "Mark as Reserved",
              onClick: () => onUpdateStatus(table.id, "reserved"),
            },
          ]}
        />
      </div>

      {/* 4. Action Buttons Footer (Secondary QR Actions) */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQRModal}
          className="h-8 text-[11px] font-bold text-slate-700 border-slate-200/90 hover:border-[#16A34A] hover:text-[#16A34A] rounded-xl px-2 gap-1"
        >
          <QrCode className="h-3.5 w-3.5" /> View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQRModal}
          className="h-8 text-[11px] font-bold text-slate-700 border-slate-200/90 hover:border-[#16A34A] hover:text-[#16A34A] rounded-xl px-2"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQRModal}
          className="h-8 text-[11px] font-bold text-slate-700 border-slate-200/90 hover:border-[#16A34A] hover:text-[#16A34A] rounded-xl px-2"
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
