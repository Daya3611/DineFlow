"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, TriangleAlert, X } from "lucide-react";
import { useToastStore } from "@/lib/toast";
import { useEffect, useRef } from "react";

const toastVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

function ToastItem({ t, removeToast }: { t: any; removeToast: (id: string) => void }) {
  const timerRef = useRef<NodeJS.Timeout>(null);

  const startTimer = () => {
    timerRef.current = setTimeout(() => removeToast(t.id), 4000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, []);

  return (
    <motion.div
      layout
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={toastVariants}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className={`pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 min-w-[300px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border backdrop-blur-md rounded-2xl ${
        t.type === "success"
          ? "border-green-200 text-green-900"
          : t.type === "error"
          ? "border-red-200 text-red-900"
          : "border-amber-200 text-amber-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`p-1.5 rounded-full ${
            t.type === "success"
              ? "bg-green-100 text-green-600"
              : t.type === "error"
              ? "bg-red-100 text-red-600"
              : "bg-amber-100 text-amber-600"
          }`}
        >
          {t.type === "success" && <Check className="h-4 w-4" strokeWidth={3} />}
          {t.type === "error" && <X className="h-4 w-4" strokeWidth={3} />}
          {t.type === "warning" && <TriangleAlert className="h-4 w-4" strokeWidth={3} />}
        </span>
        <p className="font-semibold text-sm tracking-tight">{t.message}</p>
      </div>
      <button
        onClick={() => removeToast(t.id)}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function FramerToaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed z-[9999] top-0 left-0 right-0 md:left-auto md:right-4 p-4 flex flex-col items-center md:items-end gap-3 pointer-events-none w-full md:w-auto overflow-hidden">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
