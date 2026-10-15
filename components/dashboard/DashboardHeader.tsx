"use client";

import React, { useState } from "react";
import { Search, Bell, CalendarDays, Menu } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";

interface DashboardHeaderProps {
  timeRange: string;
  setTimeRange: (val: string) => void;
  onOpenMobileMenu?: () => void;
}

export function DashboardHeader({
  timeRange,
  setTimeRange,
  onOpenMobileMenu,
}: DashboardHeaderProps) {
  const { userData, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const firstName = userData?.name
    ? userData.name.split(" ")[0]
    : "Ramesh";

  return (
    <header className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 md:border-b-0">
      {/* Mobile Top Bar + Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
            Here's what's happening today,{" "}
            <span className="font-semibold text-slate-700">{firstName}</span>
          </p>
        </div>

        {/* Mobile menu toggle button */}
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="md:hidden text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Header Actions (Search, Date Selector, Notifications, User) */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Compact Search Input */}
        <div className="relative flex-1 sm:w-64 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-[#F8FAFC] border border-slate-200/90 rounded-xl font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white transition-all"
          />
        </div>

        {/* Date Selector */}
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v || "7d")}>
          <SelectTrigger className="h-9 w-[135px] sm:w-[145px] rounded-xl border-slate-200/90 bg-[#F8FAFC] text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl border-slate-200 shadow-xl">
            <SelectItem value="7d" className="text-xs font-semibold cursor-pointer">
              Last 7 days
            </SelectItem>
            <SelectItem value="30d" className="text-xs font-semibold cursor-pointer">
              Last 30 days
            </SelectItem>
            <SelectItem value="6m" className="text-xs font-semibold cursor-pointer">
              Last 6 months
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger className="h-9 w-9 rounded-xl border border-slate-200/90 bg-[#F8FAFC] text-slate-600 hover:bg-slate-100 relative shrink-0 cursor-pointer flex items-center justify-center">
            <Bell className="h-4 w-4 text-slate-600" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#16A34A] ring-2 ring-white" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl p-4 shadow-xl border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notifications
              </h4>
              <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full">
                2 new
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <p className="text-xs font-semibold text-slate-900">New Order #ORD-1234</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Table T-05 placed a new order for 4 items.</p>
                <span className="text-[10px] text-slate-400 mt-1 block">2 minutes ago</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <p className="text-xs font-semibold text-slate-900">Table T-02 Reserved</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Booking confirmed for 7:30 PM today.</p>
                <span className="text-[10px] text-slate-400 mt-1 block">1 hour ago</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile Avatar */}
        <div className="h-9 w-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 cursor-pointer">
          {userData?.photoUrl || user?.photoURL ? (
            <img
              src={(userData?.photoUrl || user?.photoURL) as string}
              alt="Avatar"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{userData?.name ? userData.name.charAt(0).toUpperCase() : "R"}</span>
          )}
        </div>
      </div>
    </header>
  );
}
