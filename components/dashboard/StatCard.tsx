"use client";

import React from "react";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  comparison?: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  trendPct?: number;
  badgeLabel?: string;
  badgeHref?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  comparison,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  trendPct,
  badgeLabel,
  badgeHref,
  loading,
}: StatCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 group overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-9 w-9 rounded-xl ${iconBgClass} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}
            >
              <Icon className={`h-4.5 w-4.5 ${iconColorClass}`} size={18} />
            </div>
          </div>

          {/* Right badge pill if present (e.g. Menu badge) */}
          {badgeLabel && badgeHref && (
            <Link
              href={badgeHref}
              className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-full transition-colors"
            >
              {badgeLabel}
            </Link>
          )}

          {/* Trend Badge Pill */}
          {trendPct !== undefined && !loading && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                trendPct >= 0
                  ? "bg-emerald-50 text-[#16A34A]"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {trendPct >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>

        {/* Metric Value */}
        {loading ? (
          <Skeleton className="h-9 w-32 my-1 rounded-lg" />
        ) : (
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
            {value}
          </h2>
        )}

        {/* Comparison / Supporting Text */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          {trendPct !== undefined && (
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                trendPct >= 0 ? "bg-[#16A34A]" : "bg-red-500"
              }`}
            />
          )}
          {comparison && <span>{comparison}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
