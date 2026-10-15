"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { Restaurant, Table as TableType, Reservation, Waitlist } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
  Compass,
  QrCode,
  Star,
  Clock,
  Users,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronRight,
  Share2,
  Heart,
  ArrowLeft,
  Utensils,
  Wifi,
  Car,
  Wind,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";

/* ── Interface for Menu Item from API ── */
interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  hasHalfPortion?: boolean;
  halfPrice?: number | null;
  category: string;
  image?: string;
  description?: string;
  dietaryTags?: string[]; // e.g. ["veg", "non-veg", "spicy"]
  highlight?: string; // "chef_special", "bestseller", etc.
  isAvailable?: boolean;
}

interface CustomerRestaurantViewProps {
  initialRestaurant: Restaurant;
  slug: string;
}

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop";

const SEATING_AREAS = [
  { id: "indoor", label: "Indoor AC", subtitle: "Cool & Quiet" },
  { id: "courtyard", label: "Courtyard", subtitle: "Dhaba Style" },
  { id: "family", label: "Family Hall", subtitle: "Spacious" },
  { id: "outdoor", label: "Outdoor Patio", subtitle: "Fresh Air" },
];

const TIME_SLOTS = [
  { time: "12:00 PM", period: "lunch", value: "12:00" },
  { time: "12:30 PM", period: "lunch", value: "12:30" },
  { time: "1:00 PM", period: "lunch", value: "13:00" },
  { time: "1:30 PM", period: "lunch", value: "13:30" },
  { time: "2:00 PM", period: "lunch", value: "14:00" },
  { time: "7:00 PM", period: "dinner", value: "19:00" },
  { time: "7:30 PM", period: "dinner", value: "19:30" },
  { time: "8:00 PM", period: "dinner", value: "20:00" },
  { time: "8:30 PM", period: "dinner", value: "20:30" },
  { time: "9:00 PM", period: "dinner", value: "21:00" },
  { time: "9:30 PM", period: "dinner", value: "21:30" },
];

const SPECIAL_REQUEST_OPTIONS = [
  "Anniversary",
  "High Chair",
  "Quiet Table",
  "Wheelchair Access",
  "Birthday Setup",
];

export function CustomerRestaurantView({
  initialRestaurant,
  slug,
}: CustomerRestaurantViewProps) {
  const restaurant = initialRestaurant;

  /* ── State ── */
  const [activeTab, setActiveTab] = useState<"book" | "menu" | "amenities" | "reviews">("book");
  const [isLiked, setIsLiked] = useState(false);

  // Menu & Table data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [tables, setTables] = useState<TableType[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<Waitlist[]>([]);

  // Booking Flow Controls
  const [guestCount, setGuestCount] = useState<number>(4);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSeating, setSelectedSeating] = useState<string>("Indoor AC");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("7:30 PM");
  const [selectedRequests, setSelectedRequests] = useState<string[]>(["Quiet Table"]);

  // Booking Details Modal & OTP
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState<boolean>(false);
  
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("");
  const [customNote, setCustomNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [timer, setTimer] = useState(0);

  // Confirmation state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    bookingCode: string;
    type: "reservation" | "waitlist";
    date: string;
    time: string;
    guests: number;
    seating: string;
  } | null>(null);

  // Generated Dates (Today + 6 days)
  const availableDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(today, i);
      let dayLabel = format(date, "EEE dd");
      if (i === 0) dayLabel = `Today ${format(date, "MMM dd")}`;
      if (i === 1) dayLabel = `Tomorrow ${format(date, "MMM dd")}`;
      return {
        date,
        formattedStr: format(date, "yyyy-MM-dd"),
        label: dayLabel,
        shortDay: format(date, "EEE"),
        dayNum: format(date, "dd"),
      };
    });
  }, []);

  const selectedDateObj = availableDates[selectedDateIndex] || availableDates[0];

  /* ── 1. Fetch Real Menu Items ── */
  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoadingMenu(true);
        const res = await fetch(`/api/menu/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setMenuItems(data);
        }
      } catch (err) {
        console.error("Failed to load menu", err);
      } finally {
        setLoadingMenu(false);
      }
    }
    fetchMenu();
  }, [slug]);

  /* ── 2. Fetch Real Tables for Restaurant ── */
  useEffect(() => {
    if (!restaurant?.id) return;
    const qTables = query(
      collection(db, "tables"),
      where("restaurantId", "==", restaurant.id)
    );
    const unsubscribe = onSnapshot(qTables, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TableType[];
      setTables(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  /* ── 3. Subscribe Real Reservations for Selected Date ── */
  useEffect(() => {
    if (!restaurant?.id || !selectedDateObj.formattedStr) return;
    const qRes = query(
      collection(db, "reservations"),
      where("restaurantId", "==", restaurant.id),
      where("date", "==", selectedDateObj.formattedStr)
    );
    const unsubscribe = onSnapshot(qRes, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
      setReservations(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id, selectedDateObj.formattedStr]);

  /* ── 4. Subscribe Real Waitlist ── */
  useEffect(() => {
    if (!restaurant?.id) return;
    const qWL = query(
      collection(db, "waitlist"),
      where("restaurantId", "==", restaurant.id)
    );
    const unsubscribe = onSnapshot(qWL, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Waitlist[];
      setWaitlistEntries(list);
    });
    return () => unsubscribe();
  }, [restaurant?.id]);

  /* ── OTP Timer Countdown ── */
  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (timer > 0) iv = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  /* ── Categories from fetched menu ── */
  const menuCategories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category || "General")));
    return ["All", ...cats];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (selectedCategory === "All") return menuItems;
    return menuItems.filter((m) => m.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  /* ── Real Availability Calculation ── */
  const getSlotAvailabilityInfo = (timeString: string) => {
    // Total tables compatible with guest size
    const compatibleTables = tables.filter(
      (t) => (t.capacity || 4) >= guestCount
    );

    const totalCompatible = compatibleTables.length > 0 ? compatibleTables.length : Math.max(1, Math.floor((tables.length || 6)));

    // Count existing reservations at this time
    const reservedAtTime = reservations.filter(
      (r) =>
        r.time === timeString &&
        ["confirmed", "pending", "seated", "seated_now"].includes(r.status)
    ).length;

    const availableCount = Math.max(0, totalCompatible - reservedAtTime);

    if (availableCount > 3) {
      return {
        status: "available",
        tablesLeft: availableCount,
        badgeText: `${availableCount} tables available`,
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        isWaitlist: false,
      };
    } else if (availableCount > 0) {
      return {
        status: "limited",
        tablesLeft: availableCount,
        badgeText: `Only ${availableCount} table${availableCount > 1 ? "s" : ""} left!`,
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
        isWaitlist: false,
      };
    } else {
      return {
        status: "full",
        tablesLeft: 0,
        badgeText: "Waitlist Only",
        badgeColor: "bg-slate-100 text-slate-500 border-slate-200",
        isWaitlist: true,
      };
    }
  };

  const selectedSlotInfo = useMemo(() => {
    return getSlotAvailabilityInfo(selectedTimeSlot);
  }, [selectedTimeSlot, tables, reservations, guestCount]);

  /* ── Toggle Special Request Pill ── */
  const toggleRequest = (req: string) => {
    setSelectedRequests((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    );
  };

  /* ── Trigger Booking Action ── */
  const handleInitiateBooking = () => {
    if (selectedSlotInfo.isWaitlist) {
      setIsWaitlistModalOpen(true);
    } else {
      setIsBookingModalOpen(true);
    }
  };

  /* ── Submit Booking / Send OTP ── */
  const handleSendOtp = async () => {
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setSubmitting(true);
    try {
      const target = email.trim() || phone.trim();
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setTimer(300);
      setShowOtp(true);
      toast.success(`OTP sent to ${target}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Finalize Reservation after OTP ── */
  const handleFinalizeBooking = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setVerifying(true);
    try {
      const target = email.trim() || phone.trim();
      const vpRes = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, otp }),
      });
      if (!vpRes.ok) {
        const vpData = await vpRes.json();
        throw new Error(vpData.error || "Invalid OTP");
      }

      // Auto-assign table if available
      const compatibleTables = tables.filter((t) => (t.capacity || 4) >= guestCount);
      const freeTable = compatibleTables.find(
        (t) => !reservations.some((r) => r.tableId === t.id && r.time === selectedTimeSlot)
      );

      const isWaitlistBooking = selectedSlotInfo.isWaitlist;
      const type = isWaitlistBooking ? "waitlist" : "reservation";

      const payload = {
        type,
        restaurantId: restaurant.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        date: selectedDateObj.formattedStr,
        time: selectedTimeSlot,
        guestCount: String(guestCount),
        seatingPreference: selectedSeating,
        occasion: occasion || undefined,
        specialRequest: selectedRequests.join(", "),
        notes: customNote.trim() || undefined,
        tableId: freeTable?.id || undefined,
        tableName: freeTable ? `Table ${freeTable.tableNumber}` : undefined,
        otpVerified: true,
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      const codeSuffix = (data.id || "").slice(-5).toUpperCase();
      const code = `DF-${codeSuffix || "8K29Q"}`;

      setConfirmedBooking({
        id: data.id,
        bookingCode: code,
        type,
        date: selectedDateObj.label,
        time: selectedTimeSlot,
        guests: guestCount,
        seating: selectedSeating,
      });

      setShowOtp(false);
      setIsBookingModalOpen(false);
      setIsWaitlistModalOpen(false);
      toast.success(isWaitlistBooking ? "Joined waitlist successfully!" : "Table booked successfully!");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  /* ── Direct Join Waitlist (without OTP if requested) ── */
  const handleJoinWaitlistDirect = async () => {
    if (!customerName.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: "waitlist",
        restaurantId: restaurant.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        date: selectedDateObj.formattedStr,
        time: selectedTimeSlot,
        guestCount: String(guestCount),
        seatingPreference: selectedSeating,
        notes: customNote.trim() || undefined,
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join waitlist");

      const codeSuffix = (data.id || "").slice(-5).toUpperCase();
      setConfirmedBooking({
        id: data.id,
        bookingCode: `DF-WL${codeSuffix}`,
        type: "waitlist",
        date: selectedDateObj.label,
        time: selectedTimeSlot,
        guests: guestCount,
        seating: selectedSeating,
      });

      setIsWaitlistModalOpen(false);
      toast.success("You are now on the waitlist!");
    } catch (err: any) {
      toast.error(err.message || "Failed to join waitlist");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Google Calendar Generator ── */
  const getGoogleCalendarUrl = () => {
    if (!confirmedBooking) return "#";
    const text = encodeURIComponent(`Reservation at ${restaurant.name}`);
    const details = encodeURIComponent(
      `Table Reservation\nBooking ID: ${confirmedBooking.bookingCode}\nParty Size: ${confirmedBooking.guests} guests\nSeating: ${confirmedBooking.seating}\nAddress: ${restaurant.address || ""}`
    );
    const location = encodeURIComponent(restaurant.address || restaurant.name);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`;
  };

  /* ── Google Maps Directions ── */
  const getMapsDirectionsUrl = () => {
    const queryStr = encodeURIComponent(`${restaurant.name} ${restaurant.address || ""}`);
    return `https://www.google.com/maps/search/?api=1&query=${queryStr}`;
  };

  /* ── Dynamic Status ── */
  const isRestaurantOpen = true; // Based on operational profile

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-32 sm:pb-20 select-none">

      {/* ════════════════════════════════════════════
         1. RESTAURANT HERO SECTION
      ════════════════════════════════════════════ */}
      <div className="max-w-[1200px] mx-auto px-0 sm:px-4 pt-0 sm:pt-4">
        <div className="relative w-full h-[320px] sm:h-[420px] sm:rounded-3xl overflow-hidden shadow-md">
          {/* Hero Cover Image */}
          <img
            src={restaurant.logo || DEFAULT_COVER_IMAGE}
            alt={restaurant.name}
            className="w-full h-full object-cover filter brightness-[0.85]"
          />

          {/* Top Floating Header Controls */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
            <Link
              href="/"
              className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`h-10 w-10 rounded-full backdrop-blur-md flex items-center justify-center transition ${
                  isLiked ? "bg-red-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: restaurant.name,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Page link copied to clipboard!");
                  }
                }}
                className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Hero Bottom Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          {/* Hero Content Overlay */}
          <div className="absolute bottom-5 inset-x-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
            <div className="flex items-end gap-3.5">
              {/* Restaurant Logo Badge */}
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white p-1.5 shadow-xl shrink-0 border-2 border-white/80 overflow-hidden">
                {restaurant.logo ? (
                  <img
                    src={restaurant.logo}
                    alt={restaurant.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-xl">
                    {restaurant.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Status */}
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    OPEN NOW
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    Closes 11:00 PM
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                  {restaurant.name}
                </h1>
              </div>
            </div>

            {/* Rating Box */}
            <div className="bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-3 self-start sm:self-auto">
              <div className="flex items-center gap-1 text-amber-400 font-extrabold text-lg">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span>4.6</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <span className="text-xs font-semibold text-white/90">
                1.2k+ reviews
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Hero Quick Metadata & Action Bar */}
        <div className="bg-white sm:rounded-3xl border border-slate-200/80 p-5 mt-2 sm:mt-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span>North Indian • Punjabi • Tandoori</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-emerald-700 font-bold">₹₹ Casual Premium</span>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{restaurant.address || "Parvati Apartment, 03A Ganesh Pada, Thane West"}</span>
                <span className="text-slate-400 font-bold">• 1.2 km away</span>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              {restaurant.phoneNumber && (
                <a
                  href={`tel:${restaurant.phoneNumber}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-700" />
                  Call
                </a>
              )}
              <a
                href={getMapsDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
              >
                <Compass className="h-3.5 w-3.5 text-emerald-700" />
                Directions
              </a>
              <button
                onClick={() => {
                  const menuEl = document.getElementById("menu-section");
                  if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
              >
                <QrCode className="h-3.5 w-3.5 text-emerald-700" />
                Menu QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
         2. STICKY NAVIGATION BAR
      ════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs mt-4">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between h-14 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("book")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "book"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Book a Table
            </button>
            <button
              onClick={() => {
                setActiveTab("menu");
                const el = document.getElementById("menu-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "menu"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Menu Preview
            </button>
            <button
              onClick={() => {
                setActiveTab("amenities");
                const el = document.getElementById("amenities-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "amenities"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Amenities & Info
            </button>
          </div>

          <Link
            href={`/@${slug}/takeaway`}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Quick Takeaway Order
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════
         3. MAIN CONTAINER
      ════════════════════════════════════════════ */}
      <main className="max-w-[1200px] mx-auto px-4 pt-6 space-y-8">

        {/* ════════════════════════════════════════════
           PRIMARY BOOKING CARD ("1. Instant Table Booking")
        ════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Instant Table Booking
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              DineFlow Verified
            </span>
          </div>

          <div className="space-y-6">

            {/* STEP 1: NUMBER OF GUESTS */}
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 block">
                1. NUMBER OF GUESTS
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                  const isSelected = guestCount === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setGuestCount(num)}
                      className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl text-base font-extrabold transition-all shrink-0 border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 ring-2 ring-emerald-400/40"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  onClick={() => setGuestCount((g) => (g >= 12 ? 1 : g + 1))}
                  className="h-11 px-4 rounded-2xl text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition shrink-0"
                >
                  {guestCount > 8 ? `${guestCount} Guests` : "More +"}
                </button>
              </div>
            </div>

            {/* STEP 2: SELECT DATE */}
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 block">
                2. SELECT DATE
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {availableDates.slice(0, 4).map((dObj, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  return (
                    <button
                      key={dObj.formattedStr}
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`p-3.5 rounded-2xl text-center border transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-extrabold uppercase tracking-wider ${
                          isSelected ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {idx === 0 ? "TODAY" : idx === 1 ? "TOMORROW" : dObj.shortDay}
                      </p>
                      <p className="text-sm sm:text-base font-extrabold mt-0.5">
                        {format(dObj.date, "MMM dd")}
                      </p>
                    </button>
                  );
                })}

                {/* Custom Date Picker */}
                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    className="w-full h-full p-3.5 rounded-2xl text-center border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex flex-col items-center justify-center"
                  >
                    <CalendarIcon className="h-4 w-4 mb-0.5 text-emerald-700" />
                    <span className="text-xs font-extrabold">More Dates</span>
                  </button>
                </div>
              </div>
            </div>

            {/* STEP 3: SELECT TIME SLOT */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  3. SELECT TIME SLOT
                </label>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  High Demand Tonight
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIME_SLOTS.slice(5).map((slot) => {
                  const info = getSlotAvailabilityInfo(slot.time);
                  const isSelected = selectedTimeSlot === slot.time;
                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTimeSlot(slot.time)}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 ring-2 ring-emerald-400/40"
                          : info.isWaitlist
                          ? "bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-100"
                          : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-emerald-800">
                          SELECTED
                        </span>
                      )}
                      <p className="text-sm font-extrabold">{slot.time}</p>
                      <p
                        className={`text-[10px] font-semibold mt-1 ${
                          isSelected
                            ? "text-emerald-100"
                            : info.isWaitlist
                            ? "text-red-500"
                            : "text-slate-500"
                        }`}
                      >
                        {info.badgeText}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SPECIAL REQUESTS (OPTIONAL) */}
            <div>
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5 block">
                Special Requests (Optional):
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_REQUEST_OPTIONS.map((opt) => {
                  const isChecked = selectedRequests.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleRequest(opt)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                        isChecked
                          ? "bg-emerald-100/80 text-emerald-800 border-emerald-300"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isChecked ? `✓ ${opt}` : `+ ${opt}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PEAK TIME WAITLIST BANNER (IF FULL OR WAITLIST) */}
            {selectedSlotInfo.isWaitlist && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-950">
                      Peak Time Waitlist
                    </h4>
                    <p className="text-xs text-amber-800 font-medium">
                      Need {selectedTimeSlot}? Est. wait 20-25 mins
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWaitlistModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-xs transition shadow-sm shrink-0"
                >
                  Join Queue
                </button>
              </div>
            )}

            {/* MAIN CONTINUE BOOKING DESKTOP CTA */}
            <div className="pt-2">
              <button
                onClick={handleInitiateBooking}
                className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all ${
                  selectedSlotInfo.isWaitlist
                    ? "bg-amber-700 hover:bg-amber-800 text-white shadow-amber-200"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                }`}
              >
                {selectedSlotInfo.isWaitlist ? (
                  <>Join Waitlist for {selectedTimeSlot}</>
                ) : (
                  <>Continue Booking ({guestCount} Guests • {selectedTimeSlot}) →</>
                )}
              </button>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════════
           4. MENU PREVIEW ("Famous Dhaba Delicacies")
        ════════════════════════════════════════════ */}
        <section id="menu-section" className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Famous Dhaba Delicacies
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cooked in authentic slow fire clay tandoor
              </p>
            </div>
            <Link
              href={`/@${slug}/menu`}
              className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:underline"
            >
              Full Menu <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            {menuCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          {loadingMenu ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2 font-medium">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> Loading menu items...
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500 font-medium text-sm">
              No menu items available in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMenuItems.slice(0, 6).map((item) => {
                const isVeg = !item.dietaryTags?.includes("non-veg");
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Veg / Non-Veg Indicator */}
                        <div
                          className={`h-4 w-4 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                            isVeg ? "border-emerald-600" : "border-red-600"
                          }`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${
                              isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                        </div>
                        {item.highlight && item.highlight !== "none" && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            {item.highlight.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <p className="text-sm font-black text-slate-900 pt-1">
                        ₹{item.price}
                      </p>
                    </div>

                    {/* Image / Quick Add */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-400">
                          <Utensils className="h-6 w-6" />
                        </div>
                      )}
                      <Link
                        href={`/@${slug}/takeaway`}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white text-slate-800 border border-slate-200 text-xs font-extrabold transition shadow-2xs"
                      >
                        + Add
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════
           5. ALREADY SEATED QUICK ORDER BANNER
        ════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold">
                Already seated at Table #5?
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Order directly to kitchen without waiting for staff.
              </p>
            </div>
          </div>
          <Link
            href={`/@${slug}/takeaway`}
            className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs transition text-center shadow-sm shrink-0"
          >
            Quick Order →
          </Link>
        </div>

        {/* ════════════════════════════════════════════
           6. AMENITIES & EXPERIENCE SECTION
        ════════════════════════════════════════════ */}
        <section id="amenities-section" className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-6">
            Amenities & Experience
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Car className="h-5 w-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">
                Valet Parking
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Wifi className="h-5 w-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">
                Free Fast Wi-Fi
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Wind className="h-5 w-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">
                Full AC Dining
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">
                Pure Ghee Certified
              </span>
            </div>
          </div>

          {/* Operational Hours Box */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between gap-4 text-xs font-semibold text-slate-600">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Lunch Hours:
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                12:00 PM – 03:30 PM
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Dinner Hours:
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                07:00 PM – 11:00 PM
              </span>
            </div>
          </div>
        </section>

      </main>

      {/* ════════════════════════════════════════════
         7. STICKY BOTTOM BOOKING BAR (MOBILE ONLY)
      ════════════════════════════════════════════ */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 p-4 z-40 sm:hidden flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Summary
          </p>
          <p className="text-xs font-black text-slate-900">
            {guestCount} Guests • {selectedDateObj.shortDay}, {selectedTimeSlot}
          </p>
        </div>

        <button
          onClick={handleInitiateBooking}
          className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all ${
            selectedSlotInfo.isWaitlist
              ? "bg-amber-700 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {selectedSlotInfo.isWaitlist ? "Join Waitlist" : "Continue Booking →"}
        </button>
      </div>

      {/* ════════════════════════════════════════════
         8. BOOKING CONFIRMATION DETAILS MODAL
      ════════════════════════════════════════════ */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 select-none">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Confirm Your Booking
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter your details to receive confirmation for {restaurant.name}
            </p>
          </DialogHeader>

          {/* Booking Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-5 space-y-1.5">
            <p className="text-xs font-extrabold text-emerald-900">
              {restaurant.name}
            </p>
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>{selectedDateObj.label} at {selectedTimeSlot}</span>
              <span>{guestCount} Guests</span>
            </div>
            <p className="text-[11px] font-bold text-emerald-700">
              Seating: {selectedSeating}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Full Name *
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="h-11 rounded-xl border-slate-200 text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Phone Number *
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="h-11 rounded-xl border-slate-200 text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Email (Optional)
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                type="email"
                className="h-11 rounded-xl border-slate-200 text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Occasion (Optional)
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">None</option>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Business">Business Meeting</option>
                <option value="Family">Family Gathering</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Additional Notes
              </label>
              <Textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Any dietary preferences or seating notes..."
                className="rounded-xl border-slate-200 text-sm min-h-[70px]"
              />
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={submitting || !customerName.trim() || !phone.trim()}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm border-0 shadow-md mt-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
              ) : (
                "Confirm & Proceed to OTP →"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
         9. WAITLIST MODAL
      ════════════════════════════════════════════ */}
      <Dialog open={isWaitlistModalOpen} onOpenChange={setIsWaitlistModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 select-none">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold text-amber-950">
              Join Peak Time Waitlist
            </DialogTitle>
            <p className="text-xs text-amber-800 font-medium mt-1">
              {selectedTimeSlot} is currently full. Join the queue to be notified as soon as a table clears!
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Full Name *
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="h-11 rounded-xl border-slate-200 text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Phone Number *
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="h-11 rounded-xl border-slate-200 text-sm font-medium"
              />
            </div>

            <Button
              onClick={handleJoinWaitlistDirect}
              disabled={submitting || !customerName.trim() || !phone.trim()}
              className="w-full h-12 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-sm border-0 shadow-md mt-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Joining Queue...</>
              ) : (
                "Join Waitlist Now"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
         10. OTP VERIFICATION DIALOG
      ════════════════════════════════════════════ */}
      <Dialog open={showOtp} onOpenChange={setShowOtp}>
        <DialogContent className="max-w-sm rounded-3xl p-6 text-center select-none">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Verify Your Phone
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We've sent a 6-digit verification code to{" "}
              <strong className="text-slate-900">{email || phone}</strong>.
            </p>
          </DialogHeader>

          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg font-bold" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleFinalizeBooking}
            disabled={verifying || otp.length !== 6}
            className="w-full h-12 rounded-xl font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md"
          >
            {verifying ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
            ) : (
              "Verify & Confirm Booking"
            )}
          </Button>

          <div className="mt-4 text-center">
            <button
              className={`text-xs font-bold ${
                timer > 0 ? "text-slate-400 cursor-not-allowed" : "text-emerald-700 hover:underline"
              }`}
              disabled={timer > 0 || verifying || submitting}
              onClick={() => {
                if (timer === 0) {
                  setOtp("");
                  handleSendOtp();
                }
              }}
            >
              {timer > 0
                ? `Resend OTP in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`
                : "Resend OTP"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
         11. CUSTOMER CONFIRMATION SCREEN MODAL
      ════════════════════════════════════════════ */}
      <Dialog
        open={Boolean(confirmedBooking)}
        onOpenChange={(open) => {
          if (!open) setConfirmedBooking(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 text-center select-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Animated Check Icon */}
            <div
              className={`h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ${
                confirmedBooking?.type === "waitlist"
                  ? "bg-amber-500 shadow-amber-200"
                  : "bg-emerald-600 shadow-emerald-200"
              }`}
            >
              <CheckCircle className="h-10 w-10 text-white" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
              {confirmedBooking?.type === "waitlist"
                ? "You're on the Waitlist! 🎉"
                : "You're Booked! 🎉"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Confirmation sent to <strong className="text-slate-900">{phone}</strong>
            </p>

            {/* Summary Details Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-6 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-400 uppercase">Booking ID</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {confirmedBooking?.bookingCode}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-500">Restaurant:</span>
                <span className="font-bold text-slate-900">{restaurant.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Date & Time:</span>
                <span className="font-bold text-slate-900">
                  {confirmedBooking?.date}, {confirmedBooking?.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Guests & Seating:</span>
                <span className="font-bold text-slate-900">
                  {confirmedBooking?.guests} Guests ({confirmedBooking?.seating})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="font-bold text-slate-500">Status:</span>
                <span className="font-black text-emerald-700 uppercase">
                  CONFIRMED
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <CalendarIcon className="h-4 w-4 text-emerald-700" />
                Add to Calendar
              </a>
              <a
                href={getMapsDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Compass className="h-4 w-4 text-emerald-700" />
                Get Directions
              </a>
            </div>

            <Button
              onClick={() => setConfirmedBooking(null)}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs border-0"
            >
              Done
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
