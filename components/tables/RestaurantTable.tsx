"use client";

import React from "react";
import { Chair } from "./Chair";
import { TableStatus } from "@/types";

interface RestaurantTableProps {
  tableNumber: string;
  capacity: number;
  status?: TableStatus;
}

export function RestaurantTable({
  tableNumber,
  capacity = 4,
  status = "free",
}: RestaurantTableProps) {
  const cap = Math.max(1, capacity);

  // Status background and border theme for central table
  const getTableTheme = () => {
    switch (status) {
      case "occupied":
        return "bg-red-600 text-white shadow-[0_4px_16px_rgba(220,38,38,0.22)] border-red-500";
      case "reserved":
        return "bg-amber-600 text-white shadow-[0_4px_16px_rgba(217,119,6,0.22)] border-amber-500";
      case "cleaning":
        return "bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.22)] border-amber-400";
      case "free":
      default:
        return "bg-[#16A34A] text-white shadow-[0_4px_16px_rgba(22,163,74,0.22)] border-emerald-500";
    }
  };

  // Label formatting (e.g. "1" -> "T1", "Table 5" -> "T5" or "T5")
  const displayLabel = () => {
    const trimmed = tableNumber.trim();
    if (/^\d+$/.test(trimmed)) return `T${trimmed}`;
    if (trimmed.toLowerCase().startsWith("table")) {
      const parts = trimmed.split(" ");
      return parts.length > 1 ? `T${parts[1]}` : trimmed;
    }
    return trimmed.length > 4 ? trimmed.substring(0, 4) : trimmed;
  };

  // Determine chair layout arrangement
  if (cap <= 4) {
    const hasTop = cap >= 1;
    const hasBottom = cap >= 2;
    const hasLeft = cap >= 3;
    const hasRight = cap >= 4;

    return (
      <div className="relative flex items-center justify-center p-3 select-none">
        <div className="flex flex-col items-center gap-1.5">
          {/* Top Chair */}
          <div className="h-3.5 flex items-center justify-center">
            {hasTop && <Chair orientation="top" status={status} />}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Left Chair */}
            <div className="w-3.5 flex items-center justify-center">
              {hasLeft && <Chair orientation="left" status={status} />}
            </div>

            {/* Central Table (Square) */}
            <div
              className={`w-20 sm:w-24 h-20 sm:h-24 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center transition-all duration-300 ${getTableTheme()}`}
            >
              <span className="text-base sm:text-lg font-extrabold tracking-tight">
                {displayLabel()}
              </span>
            </div>

            {/* Right Chair */}
            <div className="w-3.5 flex items-center justify-center">
              {hasRight && <Chair orientation="right" status={status} />}
            </div>
          </div>

          {/* Bottom Chair */}
          <div className="h-3.5 flex items-center justify-center">
            {hasBottom && <Chair orientation="bottom" status={status} />}
          </div>
        </div>
      </div>
    );
  }

  // Rectangular table layout for 5+ seats
  const topCount = Math.ceil((cap - 2) / 2);
  const bottomCount = Math.floor((cap - 2) / 2);

  // Dynamic table width according to capacity
  const getRectWidth = () => {
    if (cap <= 6) return "w-32 sm:w-36";
    if (cap <= 8) return "w-40 sm:w-44";
    if (cap <= 10) return "w-48 sm:w-52";
    return "w-56 sm:w-60";
  };

  return (
    <div className="relative flex items-center justify-center p-3 select-none">
      <div className="flex flex-col items-center gap-1.5">
        {/* Top Row Chairs */}
        <div className={`h-3.5 flex items-center justify-around px-4 ${getRectWidth()}`}>
          {Array.from({ length: topCount }).map((_, i) => (
            <Chair key={`top-${i}`} orientation="top" status={status} />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Left Chair */}
          <div className="w-3.5 flex items-center justify-center">
            <Chair orientation="left" status={status} />
          </div>

          {/* Central Table (Rectangular) */}
          <div
            className={`${getRectWidth()} h-16 sm:h-20 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center transition-all duration-300 ${getTableTheme()}`}
          >
            <span className="text-base sm:text-lg font-extrabold tracking-tight">
              {displayLabel()}
            </span>
          </div>

          {/* Right Chair */}
          <div className="w-3.5 flex items-center justify-center">
            <Chair orientation="right" status={status} />
          </div>
        </div>

        {/* Bottom Row Chairs */}
        <div className={`h-3.5 flex items-center justify-around px-4 ${getRectWidth()}`}>
          {Array.from({ length: bottomCount }).map((_, i) => (
            <Chair key={`bottom-${i}`} orientation="bottom" status={status} />
          ))}
        </div>
      </div>
    </div>
  );
}
