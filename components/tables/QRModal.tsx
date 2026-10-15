"use client";

import React, { useRef } from "react";
import QRCode from "react-qr-code";
import { X, Download, Printer, Copy, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  capacity?: number;
  qrUrl: string;
  restaurantName?: string;
  restaurantLogo?: string;
}

export function QRModal({
  isOpen,
  onClose,
  tableNumber,
  capacity = 4,
  qrUrl,
  restaurantName = "DineFlow Restaurant",
  restaurantLogo,
}: QRModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast.success("QR Menu link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    const svg = document.getElementById(`qr-svg-${tableNumber}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `Table_${tableNumber}_QR.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success("QR Code downloaded as SVG!");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print QR card");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Table ${tableNumber} QR - ${restaurantName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
            .card { border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; text-align: center; max-width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .logo { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
            .table-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; font-weight: 800; font-size: 18px; padding: 6px 16px; border-radius: 999px; margin-top: 12px; margin-bottom: 20px; }
            .qr-box { background: #fff; padding: 16px; border-radius: 16px; border: 2px solid #bbf7d0; display: inline-block; }
            .instructions { font-size: 13px; color: #64748b; margin-top: 16px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">${restaurantName}</div>
            <div class="table-badge">TABLE ${tableNumber}</div>
            <br/>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" width="200" height="200" alt="QR" />
            </div>
            <p class="instructions">Scan with your phone camera to view our digital menu & order online</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Card Header & Branding */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-[#16A34A]" />
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              {restaurantName}
            </span>
          </div>

          <div className="mt-1 mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[#16A34A] font-extrabold text-sm">
            <span>Table {tableNumber}</span>
            <span className="text-emerald-300">·</span>
            <span className="text-xs font-semibold text-emerald-700">{capacity} Seats</span>
          </div>

          {/* QR Code Container */}
          <div
            ref={printRef}
            className="p-4 bg-white rounded-2xl border-2 border-emerald-100 shadow-xs mb-5"
          >
            <QRCode
              id={`qr-svg-${tableNumber}`}
              value={qrUrl}
              size={180}
              level="H"
              fgColor="#0f172a"
            />
          </div>

          <p className="text-xs text-slate-500 font-medium mb-5 max-w-[240px] leading-relaxed">
            Scan to view menu & place digital order directly at Table {tableNumber}
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadSVG}
                className="h-10 rounded-xl border-slate-200 hover:border-[#16A34A] text-slate-700 text-xs font-bold gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                onClick={handlePrint}
                className="h-10 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Print QR
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleCopy}
              className="w-full h-9 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Menu URL
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
