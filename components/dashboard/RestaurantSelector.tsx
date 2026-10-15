"use client";

import React from "react";
import { ChevronsUpDown, Utensils } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RestaurantSelectorProps {
  restaurant: {
    name?: string;
    plan?: string;
    subscriptionStatus?: string;
  } | null;
  subscription?: any;
}

export function RestaurantSelector({ restaurant, subscription }: RestaurantSelectorProps) {
  const planSlug = (subscription?.plan || restaurant?.plan || "basic").toLowerCase();

  const getPlanBadge = () => {
    if (planSlug.includes("premium")) {
      return { label: "PREMIUM PLAN", bgClass: "bg-[#16A34A] text-white" };
    }
    if (planSlug.includes("pro")) {
      return { label: "PRO PLAN", bgClass: "bg-[#16A34A] text-white" };
    }
    return { label: "BASIC PLAN", bgClass: "bg-slate-800 text-white" };
  };

  const badge = getPlanBadge();
  const name = restaurant?.name || "My Restaurant";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full text-left bg-[#EEF2FF] hover:bg-[#E0E7FF]/80 transition-colors border border-indigo-100/80 rounded-2xl p-3.5 flex items-center justify-between group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-slate-900 truncate tracking-tight leading-tight">
              {name}
            </p>
            <div className="mt-1.5 flex items-center">
              <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md shadow-xs ${badge.bgClass}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[230px] rounded-xl p-1.5 shadow-xl border-slate-200" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1.5">
            Active Restaurant
          </DropdownMenuLabel>
          <DropdownMenuItem className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer font-medium text-slate-800 focus:bg-slate-100">
            <div className="h-7 w-7 rounded-md bg-emerald-50 text-[#16A34A] flex items-center justify-center font-bold text-xs">
              <Utensils className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-sm font-semibold">{name}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
