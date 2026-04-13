"use client";

import { LucideIcon, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from "react";
import { Button } from "@/components/ui/button";

export interface AppDropdownItem {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
  /** Renders a separator BEFORE this item */
  separator?: boolean;
}

interface AppDropdownProps {
  /** Text shown next to the icon in the trigger button */
  label?: string;
  /** Lucide icon to show on the trigger (default: MoreHorizontal) */
  triggerIcon?: LucideIcon;
  /**
   * Completely custom trigger content (replaces icon + label).
   * The outer <Button> styles are still applied; this is the inner content.
   */
  triggerContent?: React.ReactNode;
  items: AppDropdownItem[];
  align?: "start" | "center" | "end";
  /** Extra className on the trigger button */
  triggerClassName?: string;
}

export function AppDropdown({
  label,
  triggerIcon: TriggerIcon = MoreHorizontal,
  triggerContent,
  items,
  align = "end",
  triggerClassName = "",
}: AppDropdownProps) {
  const defaultTriggerClass = label
    ? "h-8 px-3 text-[13px] font-semibold"
    : "h-8 w-8";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-gray-900 focus:outline-none ${defaultTriggerClass} ${triggerClassName}`}
      >
        {triggerContent ? (
          triggerContent
        ) : (
          <>
            <TriggerIcon className="h-4 w-4" />
            {label && <span>{label}</span>}
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className="w-44 rounded-xl border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-1"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={i}>
              {item.separator && i > 0 && (
                <DropdownMenuSeparator className="my-1 bg-gray-100" />
              )}
              <DropdownMenuItem
                onClick={item.onClick}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer ${
                  item.danger
                    ? "text-red-500 focus:text-red-600 focus:bg-red-50 data-[highlighted]:text-red-600 data-[highlighted]:bg-red-50"
                    : "text-gray-700 focus:text-gray-900 focus:bg-emerald-50 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-gray-900"
                }`}
              >
                {Icon && (
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      item.danger ? "text-red-400" : "text-gray-400"
                    }`}
                  />
                )}
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
