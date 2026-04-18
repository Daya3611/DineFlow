"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"

      icons={{
        success: <CircleCheckIcon className="size-4 text-green-600" />,
        info: <InfoIcon className="size-4 text-blue-600" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-600" />,
        error: <OctagonXIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-green-600" />,
      }}

      style={
        {
          "--normal-bg": "rgba(255,255,255,0.85)",
          "--normal-text": "#111827",
          "--normal-border": "rgba(0,0,0,0.08)",
          "--border-radius": "14px",
        } as React.CSSProperties
      }

      toastOptions={{
        classNames: {
          toast:
            "backdrop-blur-md shadow-xl border px-4 py-3 flex items-center gap-3 " +
            "transition-all duration-300",

          title: "text-sm font-medium text-gray-900",
          description: "text-xs text-gray-500",

          success:
            "border-green-200 bg-green-50/80",
          error:
            "border-red-200 bg-red-50/80",
          warning:
            "border-yellow-200 bg-yellow-50/80",
          info:
            "border-blue-200 bg-blue-50/80",
        },
      }}

      {...props}
    />
  )
}

export { Toaster }