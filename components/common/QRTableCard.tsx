"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Printer, Download, FileImage, X, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "@/lib/toast";
import { toPng } from "html-to-image";

interface QRTableCardProps {
  tableNumber: string;
  qrUrl: string;
  restaurantName: string;
  restaurantLogo?: string;
  onClose: () => void;
}

type Theme = "dark" | "light";

export function QRTableCard({
  tableNumber,
  qrUrl,
  restaurantName,
  restaurantLogo,
  onClose,
}: QRTableCardProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);

  const isDark = theme === "dark";

  const downloadPNG = async () => {
    setExporting("png");
    try {
      const node = document.getElementById("qr-print-area");
      if (!node) throw new Error("Node not found");
      await new Promise(res => setTimeout(res, 400));
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `DineFlow-Table-${tableNumber}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("PNG downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("PNG export failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadPDF = async () => {
    setExporting("pdf");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const node = document.getElementById("qr-print-area");
      if (!node) throw new Error("Node not found");
      await new Promise(res => setTimeout(res, 400));
      const canvas = await html2canvas(node, { useCORS: true, scale: 3, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a6");
      pdf.addImage(imgData, "PNG", 0, 0, 105, 148);
      pdf.save(`DineFlow-Table-${tableNumber}.pdf`);
      toast.success("PDF exported!");
    } catch (err) {
      console.error(err);
      toast.error("PDF export failed");
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            #qr-print-wrapper {
              position: fixed; inset: 0;
              display: flex; align-items: center; justify-content: center;
              background: white;
              visibility: visible;
            }
            #qr-print-area, #qr-print-area * { visibility: visible; }
            #qr-controls { display: none !important; }
          }
        `
      }} />

      <div
        id="qr-print-wrapper"
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      >
        <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">

          {/* ── Toolbar ── */}
          <div
            id="qr-controls"
            className="w-full flex items-center justify-between bg-white rounded-3xl px-4 py-2.5 shadow-xl"
          >
            <span className="text-slate-800 text-sm font-bold flex">Table {tableNumber} QR</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
                title="Toggle theme"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {isDark ? "Light" : "Dark"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                onClick={downloadPNG}
                disabled={!!exporting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {exporting === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileImage className="h-3.5 w-3.5" />}
                PNG
              </button>
              <button
                onClick={downloadPDF}
                disabled={!!exporting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow shadow-emerald-500/30 disabled:opacity-50"
              >
                {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Card ── */}
          <div
            id="qr-print-area"
            style={{
              width: "315px",
              height: "444px",
              background: isDark
                ? "linear-gradient(160deg, #064e3b 0%, #022c22 55%, #0d3d2f 100%)"
                : "#ffffff",
              borderRadius: "16px",
              border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
              boxShadow: isDark
                ? "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
                : "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "30px 28px 26px",
              position: "relative",
              overflow: "hidden",
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            {/* Glow blobs — dark only */}
            {isDark && (
              <>
                <div style={{
                  position: "absolute", top: "-60px", right: "-50px",
                  width: "200px", height: "200px",
                  background: "radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: "-50px", left: "-40px",
                  width: "170px", height: "170px",
                  background: "radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />
                {/* Subtle grid overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
                  backgroundSize: "24px 24px",
                  pointerEvents: "none",
                }} />
              </>
            )}

            {/* ── TOP: Logo + Tagline ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", zIndex: 1, width: "100%" }}>
              {/* Logo row */}
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>

                <span style={{
                  fontSize: "21px", fontWeight: 900,
                  letterSpacing: "-0.6px",
                  color: isDark ? "#ffffff" : "#052e16",
                }}>
                  {restaurantName}
                </span>
              </div>
              {/* Tagline */}
              <span style={{
                fontSize: "9px", fontWeight: 700,
                letterSpacing: "3px", textTransform: "uppercase",
                color: isDark ? "rgba(52,211,153,0.85)" : "#059669",
              }}>
                Smart Dining Experience
              </span>
              {/* Divider */}
              <div style={{
                width: "52px", height: "2px", marginTop: "2px", borderRadius: "2px",
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.7), transparent)"
                  : "linear-gradient(90deg, transparent, #10b981, transparent)",
              }} />
            </div>

            {/* ── MIDDLE: QR Code ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", zIndex: 1 }}>
              {/* QR wrapper */}
              <div style={{
                background: "#ffffff",
                padding: "18px",
                borderRadius: "14px",
                boxShadow: isDark
                  ? "0 0 0 1px rgba(255,255,255,0.10), 0 12px 40px rgba(0,0,0,0.45)"
                  : "0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px #e5e7eb",
              }}>
                <QRCode
                  value={qrUrl || "https://dineflow.pro"}
                  size={156}
                  level="H"
                  fgColor="#0a0a0a"
                  bgColor="#ffffff"
                />
              </div>

              {/* Scan → Order → Eat icon strip */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.65 }}>
                {/* Scan */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#6ee7b7" : "#059669"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h2m3 0h2M14 17h5m0 0v3m0-3h2" />
                </svg>
                <div style={{ width: "12px", height: "1px", background: isDark ? "rgba(110,231,183,0.5)" : "#a7f3d0" }} />
                {/* Menu */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#6ee7b7" : "#059669"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h12" />
                </svg>
                <div style={{ width: "12px", height: "1px", background: isDark ? "rgba(110,231,183,0.5)" : "#a7f3d0" }} />
                {/* Bag */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#6ee7b7" : "#059669"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>

              {/* CTA */}
              <span style={{
                fontSize: "8.5px", fontWeight: 800,
                letterSpacing: "2.5px", textTransform: "uppercase",
                color: isDark ? "rgba(52,211,153,0.95)" : "#059669",
              }}>
                Scan to View Menu &amp; Order
              </span>
            </div>

            {/* ── BOTTOM: Table number + footer ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", zIndex: 1, width: "100%" }}>
              <div style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "#f0fdf4",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#bbf7d0"}`,
                borderRadius: "32px",
                padding: "9px 32px",
                fontSize: "21px", fontWeight: 800,
                color: isDark ? "#ffffff" : "#052e16",
                letterSpacing: "-0.4px",
              }}>
                Table {tableNumber}
              </div>
              <span style={{
                fontSize: "7.5px", fontWeight: 600,
                letterSpacing: "1.8px", textTransform: "uppercase",
                color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
              }}>
                Powered by DineFlow
              </span>
            </div>
          </div>

          {/* Hint */}
          <p className="text-white/40 text-xs text-center">
            A6 · 105 × 148 mm · Print-ready
          </p>
        </div>
      </div>
    </>
  );
}
