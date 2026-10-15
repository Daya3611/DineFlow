"use client";

import React from "react";
import Link from "next/link";
import { Zap, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubscriptionCardProps {
  subscription?: any;
  restaurant?: any;
}

export function SubscriptionCard({ subscription, restaurant }: SubscriptionCardProps) {
  const planSlug = (subscription?.plan || restaurant?.plan || "Premiumplan-1999").toString();

  const formattedPlan =
    planSlug.toLowerCase().includes("premium")
      ? "Premiumplan-1999"
      : planSlug.toLowerCase().includes("pro")
      ? "Pro Plan"
      : planSlug.toLowerCase().includes("basic")
      ? "Basic Plan"
      : planSlug;

  const remainingDays = subscription?.expiryDate
    ? Math.ceil((subscription.expiryDate - Date.now()) / 86400000)
    : 229; // reference design default fallback

  const isActive = restaurant?.subscriptionStatus !== "inactive" && remainingDays > 0;

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Subscription
          </h3>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/60">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-xs font-bold text-[#16A34A]">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
        {/* CURRENT PLAN Tinted Box matching screenshot */}
        <div className="bg-[#EEF2FF] border border-indigo-100/80 rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            CURRENT PLAN
          </p>
          <p className="text-base font-extrabold text-slate-900 truncate">
            {formattedPlan}
          </p>
        </div>

        {/* Expiration & Upgrade Action */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-500 font-medium">Expiration</span>
          <span className="font-bold text-slate-800">
            {remainingDays > 0 ? `Expires in ${remainingDays} days` : "Expired"}
          </span>
        </div>

        <Link href="/restaurant/subscription" className="w-full">
          <Button
            variant="outline"
            className="w-full h-9 rounded-xl border-slate-200 hover:border-[#16A34A] text-slate-700 hover:text-[#16A34A] text-xs font-bold gap-1.5 transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-[#16A34A]" />
            Manage Subscription
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
