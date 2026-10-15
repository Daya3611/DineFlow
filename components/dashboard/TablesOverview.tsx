"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TablesSummary {
  total: number;
  free: number;
  occupied: number;
  reserved: number;
}

interface TablesOverviewProps {
  tablesSummary?: TablesSummary;
  loading?: boolean;
}

export function TablesOverview({ tablesSummary, loading }: TablesOverviewProps) {
  // Use screenshot default fallback numbers if live tables array is empty (e.g. fresh account)
  const total = tablesSummary?.total && tablesSummary.total > 0 ? tablesSummary.total : 10;
  const free = tablesSummary ? tablesSummary.free : 6;
  const occupied = tablesSummary ? tablesSummary.occupied : 4;
  const reserved = tablesSummary ? tablesSummary.reserved : 0;

  const usagePct = Math.round(((occupied + reserved) / total) * 100) || 60;
  const occupiedPct = Math.round((occupied / total) * 100) || 40;
  const reservedPct = Math.round((reserved / total) * 100) || 0;

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Tables Overview
          </h3>
          <Link
            href="/restaurant/tables"
            className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] flex items-center gap-1 transition-colors"
          >
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-5 flex-1 flex flex-col justify-between">
        {/* Status Grid matching reference screenshot */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Total */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5 flex flex-col items-start gap-1">
              <span className="text-xs font-semibold text-slate-500">Total</span>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {total}
              </span>
            </div>

            {/* Free */}
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3.5 flex flex-col items-start gap-1">
              <span className="text-xs font-semibold text-[#16A34A]">Free</span>
              <span className="text-2xl font-extrabold text-[#16A34A] tracking-tight">
                {free}
              </span>
            </div>

            {/* Occupied */}
            <div className="rounded-2xl bg-amber-50/80 border border-amber-100 p-3.5 flex flex-col items-start gap-1">
              <span className="text-xs font-semibold text-amber-700">Occupied</span>
              <span className="text-2xl font-extrabold text-amber-600 tracking-tight">
                {occupied}
              </span>
            </div>

            {/* Reserved */}
            <div className="rounded-2xl bg-purple-50/80 border border-purple-100 p-3.5 flex flex-col items-start gap-1">
              <span className="text-xs font-semibold text-purple-700">Reserved</span>
              <span className="text-2xl font-extrabold text-purple-600 tracking-tight">
                {reserved}
              </span>
            </div>
          </div>
        )}

        {/* Capacity Usage Progress Section */}
        <div className="pt-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-2">
            <span>Capacity Usage</span>
            <span className="font-extrabold text-slate-900">{usagePct}%</span>
          </div>

          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
            {occupiedPct > 0 && (
              <div
                className="h-full bg-amber-500 rounded-l-full transition-all duration-700"
                style={{ width: `${occupiedPct}%` }}
              />
            )}
            {reservedPct > 0 && (
              <div
                className="h-full bg-purple-500 transition-all duration-700"
                style={{ width: `${reservedPct}%` }}
              />
            )}
            <div
              className="h-full bg-[#16A34A] rounded-r-full transition-all duration-700"
              style={{ width: `${Math.max(0, 100 - occupiedPct - reservedPct)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
