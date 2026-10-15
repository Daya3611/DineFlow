"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  Calendar,
  Compass,
  Mail,
  Download,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

export interface BookingSuccessDetails {
  bookingId: string;
  bookingCode: string;
  restaurantName: string;
  address?: string;
  phone?: string;
  date: string;
  time: string;
  guests: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  type: "reservation" | "waitlist";
}

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
  bookingDetails: BookingSuccessDetails | null;
}

export function BookingSuccessModal({
  open,
  onClose,
  bookingDetails,
}: BookingSuccessModalProps) {
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Send Email & Trigger Sparkle Celebration on Real Booking Success ONLY
  useEffect(() => {
    if (open && bookingDetails && bookingDetails.bookingId) {
      setShowContent(false);
      sendConfirmationEmail();

      // Trigger sparkle burst and then reveal details
      triggerSparkleAnimation();
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 350);

      return () => {
        clearTimeout(timer);
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      };
    }
  }, [open, bookingDetails]);

  // Resend Cooldown Timer
  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      iv = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(iv);
  }, [resendCooldown]);

  // Send Confirmation Email API Call
  const sendConfirmationEmail = async () => {
    if (!bookingDetails || !bookingDetails.customerEmail) return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/send-booking-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingDetails.bookingId,
          restaurantName: bookingDetails.restaurantName,
          date: bookingDetails.date,
          time: bookingDetails.time,
          guestCount: bookingDetails.guests,
          customerName: bookingDetails.customerName,
          customerEmail: bookingDetails.customerEmail,
          customerPhone: bookingDetails.customerPhone,
          address: bookingDetails.address,
        }),
      });

      if (res.ok) {
        setEmailStatus("sent");
        setResendCooldown(30);
      } else {
        setEmailStatus("failed");
      }
    } catch (err) {
      setEmailStatus("failed");
    }
  };

  // GPU-Friendly Sparkle & Particle Burst Animation
  const triggerSparkleAnimation = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setShowContent(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 500;
    canvas.height = rect.height || 600;

    const centerX = canvas.width / 2;
    const centerY = 90; // Align burst around top checkmark icon

    // Palette: DineFlow green, white, and subtle gold
    const colors = ["#059669", "#10B981", "#34D399", "#6EE7B7", "#F59E0B", "#FBBF24", "#FFFFFF"];

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      shape: "circle" | "star" | "sparkle";
      rotation: number;
      rotSpeed: number;
    }> = [];

    const numParticles = 55;
    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.015,
        shape: Math.random() > 0.6 ? "sparkle" : Math.random() > 0.3 ? "star" : "circle",
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    const startTime = performance.now();

    const draw4PointSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x, y, x + size, y);
      ctx.quadraticCurveTo(x, y, x, y + size);
      ctx.quadraticCurveTo(x, y, x - size, y);
      ctx.quadraticCurveTo(x, y, x, y - size);
      ctx.fill();
    };

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach((p) => {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06; // soft gravity
          p.alpha -= p.decay;
          p.rotation += p.rotSpeed;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);

          if (p.shape === "sparkle") {
            draw4PointSparkle(ctx, 0, 0, p.size * 1.2);
          } else if (p.shape === "star") {
            draw4PointSparkle(ctx, 0, 0, p.size);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      });

      if (alive && elapsed < 1200) {
        animFrameIdRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);
  };

  // Downloadable .ICS Calendar File
  const downloadIcsFile = () => {
    if (!bookingDetails) return;
    const dateFormatted = bookingDetails.date.replace(/[^0-9]/g, "") || "20260904";
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DineFlow//Restaurant Reservation//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Reservation at ${bookingDetails.restaurantName}`,
      `DESCRIPTION:Table booking for ${bookingDetails.guests} guests.\\nBooking ID: ${bookingDetails.bookingCode}`,
      `LOCATION:${bookingDetails.address || bookingDetails.restaurantName}`,
      `DTSTART:${dateFormatted}T190000Z`,
      `DTEND:${dateFormatted}T203000Z`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${bookingDetails.bookingCode}_Reservation.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(".ICS calendar file downloaded!");
  };

  // Google Calendar URL
  const getGoogleCalendarUrl = () => {
    if (!bookingDetails) return "#";
    const text = encodeURIComponent(`Table Reservation at ${bookingDetails.restaurantName}`);
    const details = encodeURIComponent(
      `Booking ID: ${bookingDetails.bookingCode}\nParty Size: ${bookingDetails.guests} Guests\nName: ${bookingDetails.customerName}`
    );
    const location = encodeURIComponent(bookingDetails.address || bookingDetails.restaurantName);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`;
  };

  // Google Maps Directions URL
  const getMapsDirectionsUrl = () => {
    if (!bookingDetails) return "#";
    const queryStr = encodeURIComponent(`${bookingDetails.restaurantName} ${bookingDetails.address || ""}`);
    return `https://www.google.com/maps/search/?api=1&query=${queryStr}`;
  };

  if (!bookingDetails) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-w-[560px] mx-auto rounded-t-3xl border-t border-slate-200 shadow-2xl bg-white p-5 sm:p-6 text-center select-none overflow-y-auto max-h-[90vh] no-scrollbar bottom-0 inset-x-0"
      >
        {/* Top Drawer Drag Handle Bar */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto mb-2 shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Canvas overlay for particle sparkles */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-20 w-full h-full"
        />

        <div className="relative z-10 space-y-4 pt-1">
          
          {/* Animated Green Circle with Checkmark Pop & Soft Glow Ripple */}
          <div className="relative flex items-center justify-center my-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-[0_0_35px_rgba(5,150,105,0.4)] relative z-10"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <Check className="h-8 w-8 sm:h-10 sm:w-10 stroke-[3]" />
              </motion.div>
            </motion.div>

            {/* Glowing ripple background */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-emerald-400/30 pointer-events-none"
            />
          </div>

          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {bookingDetails.type === "waitlist" ? "You're on the Waitlist!" : "You're Booked!"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Your table has been successfully reserved at {bookingDetails.restaurantName}.
            </p>
          </motion.div>

          {/* Real Booking Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider">Booking ID</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {bookingDetails.bookingCode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 pt-1">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Restaurant</span>
                <span className="font-extrabold text-slate-900 text-xs">{bookingDetails.restaurantName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Date & Time</span>
                <span className="font-extrabold text-slate-900 text-xs">{bookingDetails.date}, {bookingDetails.time}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Guests</span>
                <span className="font-extrabold text-slate-900 text-xs">{bookingDetails.guests} Guests</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Status</span>
                <span className="font-black text-emerald-700 uppercase text-xs">CONFIRMED</span>
              </div>
            </div>
          </motion.div>

          {/* Customer Info Line */}
          <div className="text-left bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-1">
            <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">Booked For:</p>
            <p className="font-extrabold text-sm">{bookingDetails.customerName}</p>
            <p className="font-medium text-emerald-800">{bookingDetails.customerPhone} {bookingDetails.customerEmail ? `• ${bookingDetails.customerEmail}` : ""}</p>
          </div>

          {/* Real Email Confirmation Status Box */}
          {bookingDetails.customerEmail && (
            <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {emailStatus === "sent" && `✓ Confirmation sent to ${bookingDetails.customerEmail}`}
                  {emailStatus === "sending" && `Sending confirmation to ${bookingDetails.customerEmail}...`}
                  {emailStatus === "failed" && `Couldn't send email to ${bookingDetails.customerEmail}`}
                </span>
              </div>

              <button
                disabled={resendCooldown > 0 || emailStatus === "sending"}
                onClick={sendConfirmationEmail}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition shrink-0 ${
                  resendCooldown > 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
              </button>
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              Google Cal
            </a>

            <button
              onClick={downloadIcsFile}
              className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Download .ICS
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={getMapsDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Compass className="h-4 w-4 text-emerald-700" />
              Get Directions
            </a>

            <Button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs border-0 shadow-sm"
            >
              Done
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
