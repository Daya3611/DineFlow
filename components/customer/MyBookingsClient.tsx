"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Restaurant, Reservation } from "@/types";
import { CustomerHeaderNav } from "@/components/customer/CustomerHeaderNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Users, CheckCircle, XCircle, ChevronRight, MapPin } from "lucide-react";

interface MyBookingsClientProps {
  restaurant: Restaurant;
  slug: string;
}

export function MyBookingsClient({ restaurant, slug }: MyBookingsClientProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const q = query(
      collection(db, "reservations"),
      where("restaurantId", "==", restaurant.id)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReservations(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  const filteredReservations = reservations.filter((r) => {
    if (activeTab === "upcoming") return ["confirmed", "pending", "seated"].includes(r.status);
    if (activeTab === "past") return ["completed", "arrived"].includes(r.status);
    if (activeTab === "cancelled") return r.status === "cancelled";
    return true;
  });

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, "reservations", bookingId), {
        status: "cancelled",
      });
      toast.success("Booking cancelled successfully.");
    } catch (e: any) {
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 select-none">
      <CustomerHeaderNav restaurant={restaurant} slug={slug} activeTab="my-bookings" />

      <main className="max-w-[900px] mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Table Bookings</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              View and manage your reservations at {restaurant.name}
            </p>
          </div>
          <Link
            href={`/@${slug}/book`}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition"
          >
            + Book Table
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {(["upcoming", "past", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab} ({reservations.filter((r) => {
                if (tab === "upcoming") return ["confirmed", "pending", "seated"].includes(r.status);
                if (tab === "past") return ["completed", "arrived"].includes(r.status);
                return r.status === "cancelled";
              }).length})
            </button>
          ))}
        </div>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-slate-400 font-medium text-sm">
            No {activeTab} bookings found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((res) => (
              <div key={res.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-slate-900 uppercase">
                      ID: {res.id.slice(-6)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {res.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">
                    {res.date} at {res.time}
                  </h3>

                  <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                    <span>{res.guestCount} Guests</span>
                    <span>•</span>
                    <span>Seating: {res.seatingPreference || "Indoor"}</span>
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {res.status !== "cancelled" && (
                    <button
                      onClick={() => handleCancelBooking(res.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs transition border border-red-200"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
