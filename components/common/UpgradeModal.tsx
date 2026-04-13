"use client";

import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  limit?: number;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const PLAN_FEATURES = [
  "Unlimited tables & menu items",
  "Priority customer support",
  "Custom branding & domain slug",
  "Advanced analytics dashboard",
];

export function UpgradeModal({ open, onOpenChange, featureName, limit }: UpgradeModalProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={[
          "flex flex-col p-0 gap-0 bg-white",
          side === "right" ? "sm:w-[400px] sm:max-w-[400px]" : "rounded-t-3xl max-h-[85dvh]",
        ].join(" ")}
      >
        {/* Close button */}
        <SheetClose
          render={
            <Button className="absolute to right-4 h-8 w-8 hover: flex items-center justify-center text-slate-500 z-10" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          }
        />

        {/* Hero gradient band */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-12 pb-10 text-white overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute top-4 right-10 h-12 w-12 rounded-full bg-white/10" />

          <div className="relative">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-1">Unlock More</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              You've hit the <span className="font-semibold text-white">{featureName}</span> limit
              {limit ? <> ({limit})</> : ""}. Upgrade to keep growing.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            What you'll get
          </p>
          {PLAN_FEATURES.map((feat) => (
            <div key={feat} className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm text-slate-700 font-medium">{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA Footer */}
        <div className="px-6 pb-8 pt-4 border-t border-slate-100 space-y-2">
          <Button className="w-full h-12 text-[15px] [0.98]" onClick={() => {
              onOpenChange(false);
              router.push("/restaurant/subscription");
            }}
          >
            View Pricing Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full h-10 text-slate-500 text-sm" onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
