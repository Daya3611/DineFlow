"use client";

import React from "react";
import {
  ShoppingBag,
  Users,
  Calendar,
  ChefHat,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  type: "order" | "table" | "booking" | "menu";
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  // Screenshot default activities fallback if live logs are empty
  const defaultActivities: ActivityItem[] = [
    {
      id: "act-1",
      title: "New order #ORD-1234",
      subtitle: "4 items · Dine-in",
      time: "2 min ago",
      type: "order",
    },
    {
      id: "act-2",
      title: "Table T-05 is now occupied",
      subtitle: "by 4 guests",
      time: "15 min ago",
      type: "table",
    },
    {
      id: "act-3",
      title: "New booking confirmed T-02",
      subtitle: "7:30 PM today",
      time: "1 hr ago",
      type: "booking",
    },
    {
      id: "act-4",
      title: "Menu item updated",
      subtitle: "Paneer Butter Masala",
      time: "2 hrs ago",
      type: "menu",
    },
  ];

  const items = activities && activities.length > 0 ? activities : defaultActivities;

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "order":
        return {
          icon: ShoppingBag,
          bgClass: "bg-emerald-50 text-[#16A34A]",
        };
      case "table":
        return {
          icon: Users,
          bgClass: "bg-amber-50 text-amber-600",
        };
      case "booking":
        return {
          icon: Calendar,
          bgClass: "bg-blue-50 text-blue-600",
        };
      case "menu":
        return {
          icon: ChefHat,
          bgClass: "bg-purple-50 text-purple-600",
        };
      default:
        return {
          icon: CheckCircle2,
          bgClass: "bg-slate-100 text-slate-600",
        };
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Recent Activity
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <div className="space-y-4">
          {items.map((item) => {
            const { icon: Icon, bgClass } = getActivityIcon(item.type);
            return (
              <div key={item.id} className="flex items-start gap-3 group">
                <div
                  className={`h-9 w-9 rounded-xl ${bgClass} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {item.time}
                    </span>
                  </div>
                  {item.subtitle && (
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
