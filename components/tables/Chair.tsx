"use client";

import React from "react";
import { TableStatus } from "@/types";

interface ChairProps {
  orientation: "top" | "bottom" | "left" | "right";
  status?: TableStatus;
}

export function Chair({ orientation, status = "free" }: ChairProps) {
  // Base styling per status
  const getStatusClasses = () => {
    switch (status) {
      case "occupied":
        return "bg-red-100/80 border-red-300/80 shadow-xs";
      case "reserved":
      case "cleaning":
        return "bg-amber-100/80 border-amber-300/80 shadow-xs";
      case "free":
      default:
        return "bg-emerald-100/80 border-emerald-300/80 shadow-xs";
    }
  };

  // Dimensions and rounded corners per orientation
  const getOrientationClasses = () => {
    switch (orientation) {
      case "top":
        return "w-6 sm:w-7 h-3 sm:h-3.5 rounded-t-lg rounded-b-xs border-b-0";
      case "bottom":
        return "w-6 sm:w-7 h-3 sm:h-3.5 rounded-b-lg rounded-t-xs border-t-0";
      case "left":
        return "w-3 sm:w-3.5 h-6 sm:h-7 rounded-l-lg rounded-r-xs border-r-0";
      case "right":
        return "w-3 sm:w-3.5 h-6 sm:h-7 rounded-r-lg rounded-l-xs border-l-0";
    }
  };

  return (
    <div
      className={`border transition-all duration-300 shrink-0 ${getStatusClasses()} ${getOrientationClasses()}`}
    />
  );
}
