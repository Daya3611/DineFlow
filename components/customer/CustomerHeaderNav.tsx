"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Restaurant } from "@/types";
import {
  MapPin,
  Phone,
  Compass,
  QrCode,
  Star,
  Home,
  Calendar,
  Utensils,
  ShoppingBag,
  Clock,
  ChevronRight,
  UserCheck,
  BookCheck,
} from "lucide-react";

interface CustomerHeaderNavProps {
  restaurant: Restaurant;
  slug: string;
  activeTab: "home" | "book" | "menu" | "order" | "my-orders" | "my-bookings";
}

export function CustomerHeaderNav({
  restaurant,
  slug,
  activeTab,
}: CustomerHeaderNavProps) {
  const pathname = usePathname();

  // Navigation Links
  const navLinks = [
    { id: "home", label: "Home", href: `/@${slug}`, icon: Home },
    { id: "book", label: "Book a Table", href: `/@${slug}/book`, icon: Calendar },
    { id: "menu", label: "Menu", href: `/@${slug}/menu`, icon: Utensils },
    { id: "order", label: "Order Food", href: `/@${slug}/order`, icon: ShoppingBag },
    { id: "my-orders", label: "My Orders", href: `/@${slug}/my-orders`, icon: Clock },
    { id: "my-bookings", label: "My Bookings", href: `/@${slug}/my-bookings`, icon: BookCheck },
  ];

  const getMapsDirectionsUrl = () => {
    const queryStr = encodeURIComponent(
      `${restaurant.name} ${restaurant.address || ""}`
    );
    return `https://www.google.com/maps/search/?api=1&query=${queryStr}`;
  };

  return (
    <header className="w-full bg-white border-b border-slate-200/80 shadow-xs select-none">
      {/* 1. Global Compact Restaurant Header */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Restaurant Profile Info */}
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-emerald-700 text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-xs">
              {restaurant.logo ? (
                <img
                  src={restaurant.logo}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">
                  {restaurant.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate tracking-tight">
                  {restaurant.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  OPEN NOW
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  4.6
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                North Indian • Punjabi • Tandoori
              </p>
              <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{restaurant.address || "Parvati Apartment, 03A Ganesh Pada"}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {restaurant.phoneNumber && (
              <a
                href={`tel:${restaurant.phoneNumber}`}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-700" />
                Call
              </a>
            )}
            <a
              href={getMapsDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              <Compass className="h-3.5 w-3.5 text-emerald-700" />
              Directions
            </a>
            <Link
              href={`/@${slug}/menu`}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              <QrCode className="h-3.5 w-3.5 text-emerald-700" />
              Menu QR
            </Link>
          </div>

        </div>
      </div>

      {/* 2. Main Customer Navigation Bar (Desktop) */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 sm:hidden flex items-center justify-around py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {navLinks.slice(0, 5).map((link) => {
          const Icon = link.icon;
          const isActive = activeTab === link.id;
          return (
            <Link
              key={link.id}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-extrabold transition-colors ${
                isActive ? "text-emerald-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
